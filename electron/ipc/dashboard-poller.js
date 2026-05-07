const ModbusRTU = require('modbus-serial');
const { connectClient, getErrorMessage } = require('./modbus-helpers');

/**
 * ModbusQueue - Sequential polling queue for multi-device dashboard.
 * Prevents RS485 data collisions by reading devices one at a time.
 */
class ModbusQueue {
  constructor() {
    this.cards = [];
    this.connectionConfig = null;
    this.interval = 1000;
    this.timeout = 1000;
    this.running = false;
    this.loopTimer = null;
    this.cardResults = {};
  }

  /**
   * Start the polling loop.
   * @param {object} config - { cards, connectionConfig, interval, timeout }
   */
  start(config) {
    this.stop();

    this.cards = config.cards || [];
    this.connectionConfig = config.connectionConfig;
    this.interval = config.interval || 1000;
    this.timeout = config.timeout || 1000;
    this.running = true;
    this.cardResults = {};

    for (const card of this.cards) {
      this.cardResults[card.cardId] = { success: false, data: null, error: null, lastUpdated: null };
    }

    this._scheduleLoop();
  }

  /**
   * Stop the polling loop.
   */
  stop() {
    this.running = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /**
   * Update cards and/or interval without full restart.
   * @param {object} config - { cards?, interval?, timeout?, connectionConfig? }
   */
  update(config) {
    if (config.cards) {
      this.cards = config.cards;
      for (const card of this.cards) {
        if (!this.cardResults[card.cardId]) {
          this.cardResults[card.cardId] = { success: false, data: null, error: null, lastUpdated: null };
        }
      }
      const cardIds = new Set(this.cards.map(c => c.cardId));
      for (const id of Object.keys(this.cardResults)) {
        if (!cardIds.has(id)) {
          delete this.cardResults[id];
        }
      }
    }
    if (config.interval !== undefined) this.interval = config.interval;
    if (config.timeout !== undefined) this.timeout = config.timeout;
    if (config.connectionConfig) this.connectionConfig = config.connectionConfig;
  }

  /**
   * Get the current status and all card results.
   */
  getStatus() {
    return {
      running: this.running,
      interval: this.interval,
      cards: this.cards,
      results: { ...this.cardResults },
    };
  }

  _scheduleLoop() {
    if (!this.running) return;
    this._pollAll()
      .then(() => {
        if (this.running) {
          this.loopTimer = setTimeout(() => this._scheduleLoop(), this.interval);
        }
      })
      .catch((err) => {
        console.error('ModbusQueue polling loop terminated due to an unexpected error:', err);
        this.running = false;
      });
  }

  async _pollAll() {
    if (!this.connectionConfig || this.cards.length === 0) return;

    const client = new ModbusRTU();
    try {
      await connectClient(client, this.connectionConfig);
      client.setTimeout(this.timeout);

      for (const card of this.cards) {
        if (!this.running) break;
        let reqStartTime = Date.now();
        try {
          client.setID(card.slaveAddress);
          reqStartTime = Date.now();
          let data;
          switch (card.functionCode) {
            case 1: {
              const result = await client.readCoils(card.registerAddress, card.quantity);
              data = result.data.map(v => v ? 1 : 0);
              break;
            }
            case 2: {
              const result = await client.readDiscreteInputs(card.registerAddress, card.quantity);
              data = result.data.map(v => v ? 1 : 0);
              break;
            }
            case 3: {
              const result = await client.readHoldingRegisters(card.registerAddress, card.quantity);
              data = result.data;
              break;
            }
            case 4: {
              const result = await client.readInputRegisters(card.registerAddress, card.quantity);
              data = result.data;
              break;
            }
            default:
              throw new Error(`Unsupported function code: ${card.functionCode}`);
          }
          const latencyMs = Date.now() - reqStartTime;
          this.cardResults[card.cardId] = {
            success: true,
            data,
            error: null,
            lastUpdated: new Date().toISOString(),
            latencyMs,
          };
        } catch (error) {
          const latencyMs = Date.now() - reqStartTime;
          this.cardResults[card.cardId] = {
            success: false,
            data: null,
            error: getErrorMessage(error),
            lastUpdated: new Date().toISOString(),
            latencyMs,
          };
        }
      }

      try { await client.close(() => {}); } catch { }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      const now = new Date().toISOString();
      for (const card of this.cards) {
        this.cardResults[card.cardId] = {
          success: false,
          data: null,
          error: errorMsg,
          lastUpdated: now,
        };
      }
      try { await client.close(() => {}); } catch { }
    }
  }
}

module.exports = { ModbusQueue };

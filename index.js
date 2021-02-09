
'use strict';

const https = require('https');

const API_URL = 'https://www.1secmail.com/api/v1';

/**
 * Makes a request to the api with an endpoint
 * 
 * @method get
 * @param {string} path Api endpoint path
 * @returns {Promise<Object>} Status code and body
 * @private
 */
function get(path) {
    return new Promise((resolve, reject) => {
        https.get(API_URL + path,
            (res) => {
                let response = {
                    status: res.statusCode,
                    body: ''
                };

                res.on('data', (chunk) => response.body += chunk);
                res.on('end', () => {
                    try {
                        response.body = JSON.parse(response.body);
                    } catch {}

                    if (res.status < 200 || res.status > 299) {
                        return reject(response);
                    }

                    resolve(response);
                });

                res.on('error', reject);
            }
        );
    });
}

/**
 * Generates a unique buffer with array of used items.
 * e.g. if used = ['0f'], and type = 'hex', there is no chance that it returns a '0f' hex buffer
 * 
 * @method generateHash
 * @param {number} len Length of the buffer
 * @param {Array} used Array containing any type which will prevent the function from generating an already existing hash
 * @param {string} type Buffer type in used. Can be: hex, binary, utf8, etc.
 * @private
 */
function generateHash(len, used, type='hex') {
    let hash = '';
    for (let i = 0; i < len * 2; i++) {
        hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    }

    hash = Buffer.from(hash, 'hex');

    if (used.includes(hash.toString(type))) hash = generateHash(len, used, type);

    return hash;
}

/**
 * @constructor
 * @private
 */
function Mailbox() {
    this._listeners = {};
    this.id = null;

    /**
     * Adds an event listener to the mailbox
     * 
     * @method Mailbox.prototype.on
     * @param {string} event Event to be listened to
     * @param {function} callback Calls when event is called
     */
    this.on = function(event, callback) {
        this._listeners[event] = callback;
    }

    /**
     * Connects the mailbox with a random mail address
     * @method Mailbox.prototype.connect
     * @returns {Promise<String>} Mail address
     */
    this.connect = function() {
        delete this.connect;
        new Promise((resolve, reject) => {
            get('/?action=genRandomMailbox').then(res => {
                this.id = res.body[0];

                if (this._listeners['ready']) this._listeners['ready'](this.id);
                resolve(this.id);
            }).catch(reject);
        });
    }

    /**
     * Fetches all the messages in the inbox
     * @method Mailbox.prototype.fetchMessages
     * @returns {Promise<Array<Object>>} Array with messages
     */
    this.fetchMessages = function() {
        return new Promise((resolve, reject) => {
            get(`/?action=getMessages&login=${this.id.split('@')[0]}&domain=${this.id.split('@')[1]}`)
                .then(res => {
                    let messages = [],
                        tokens = [];
                    
                    res.body.forEach(msg => {
                        let id = generateHash(16, tokens, 'hex').toString('hex');

                        tokens.push(id);
                        messages.push({
                            _id: id,
                            from: msg.from,
                            to: this.id,
                            subject: msg.subject,
                            date: new Date(msg.date)
                        });
                    });

                    resolve(messages);
                })
                .catch(reject);
        });
    }
}

/**
 * Creates a mailbox
 * 
 * @method Create
 * @returns {Mailbox} The mailbox
 * @public
 */
function Create() {
    const mailbox = new Mailbox();
    mailbox.connect();
    return mailbox;
}

module.exports = { Create };

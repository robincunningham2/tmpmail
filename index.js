
'use strict';

const https = require('https');

const API_URL = 'https://www.1secmail.com/api/v1';

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

function generateHash(len, used, type='hex') {
    let hash = '';
    for (let i = 0; i < len * 2; i++) {
        hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    }

    hash = Buffer.from(hash, 'hex');

    if (used.includes(hash.toString(type))) hash = generateHash(len, used, type);

    return hash;
}

function Mailbox() {
    this.id;

    this.connect = function() {
        return new Promise((resolve, reject) => {
            get('/?action=genRandomMailbox').then(res => {
                this.id = res.body[0];
                resolve(this.id);
            }).catch(reject);
        });
    }

    this.destroy = function() {

    }
}

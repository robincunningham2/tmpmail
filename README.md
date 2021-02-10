# Temporary Mail
NodeJS api for temporary emails

## Install
```bash
npm install tmpmail
```

## Usage
* __Create a temporary mail client__

```js
const TmpMail = require('tmpmail');
const client = TmpMail.Create();
```

* __Wait for client to initialize, and get your email address__

```js
client.on('ready', email => {
  console.log(email);

  // Or, alternatively:
  console.log(client.id);
});
```

Example output:
```js
'2wyw9rtxwk@wwjmp.com'
```

* __Fetch messages__

```js
client.fetch().then(messages => {
  console.log(messages);
});
```

Example output:
```js
[
  {
    _id: '3e1ee21c5cce2436daa1e8206923695e',
    from: 'example@test.com',
    to: '2wyw9rtxwk@wwjmp.com',
    subject: 'Hello world!',
    date: 2021-02-09T11:46:42.000Z
  },
  {
    _id: '3e1ee21c5cce2436daa1e8206923b38a',
    from: 'example@test.com',
    to: '2wyw9rtxwk@wwjmp.com',
    subject: 'Hello world (for the second time)!',
    date: 2021-02-09T11:46:57.000Z
  }
]
```

* __Get email body__

```js
client.findMessage('3e1ee21c5cce2436daa1e8206923695e').then(msg => {
  console.log(msg);
});
```

Example output:
```js
{
  _id: '3e1ee21c5cce2436daa1e8206923695e',
  from: 'example@test.com',
  to: '2wyw9rtxwk@wwjmp.com',
  subject: 'Hello world!',
  date: 2021-02-09T11:46:42.000Z,
  body: {
    text: 'Hello world from a stranger!',
    html: ''
  }
}
```

* __Create a message listener__

```js
// Check every 1000ms (1s) for new messages
client.startMessageListener(1000, msgs => {
  console.log('Got some new message(s):\n', msgs);
});

// Stop the listener after 10s
setTimeout(client.stopMessageListener, 10000);
```

## License
[Apache 2.0](LICENSE)

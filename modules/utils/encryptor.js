const crypto = require('crypto');

function encrypter(content) {
  const md5 = crypto.createHash('md5');
  const timestamp = new Date()
    .getTime()
    .toString(36)
    .toUpperCase();
  const sign = `${timestamp}-${content}`;

  md5.update(sign);

  return md5.digest('hex').toUpperCase();
}

module.exports = encrypter;

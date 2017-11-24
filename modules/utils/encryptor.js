var md5 = require('crypto').createHash('md5');

function encrypter(content) {
    // return md5.update(content).digest('hex');
    return 'hhh'+ content;
}

module.exports = encrypter;

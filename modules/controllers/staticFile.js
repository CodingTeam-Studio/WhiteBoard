const fs = require("fs");
const path = require("path");
const url = require("url");

const commonPath = path.resolve(__dirname, "../../public");
const mimeType = {
  ".ico": "image/x-icon",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".eot": "appliaction/vnd.ms-fontobject",
  ".ttf": "aplication/font-sfnt"
};

function staticFile(req, res) {
  let {pathname} = url.parse(req.url),
    filePath = commonPath + pathname;

  fs.exists(filePath, function(exist) {
    if (!exist) {
      res.statusCode = 404;
      res.end(pathname + " not found");
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      pathname += "index.html";
      filePath += "index.html";
    }

    fs.readFile(filePath, function(err, data) {
      if (err) {
        res.statusCode = 500;
        res.end("Error getting the file: " + err);
        return;
      }

      const ext = path.parse(filePath).ext;

      res.setHeader("Content-type", mimeType[ext] || "text/plain");
      res.end(data);
    });
  });
}

module.exports = staticFile;

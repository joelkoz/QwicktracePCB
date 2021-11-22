const http = require('http');
const formidable = require('formidable');
const fs = require('fs-extra');
const path = require('path');
const ProjectLoader = require('../ProjectLoader.js');

const BASE_PATH = './app/main/web/html'


function serveStaticFile(res, fileName, contentType, internalFile) {

    if (fileName === '/') {
        fileName = '/index.html'
    }

    let filePath = path.parse(fileName);
    if (!contentType) {
        if (filePath.ext === '.html') {
            contentType = 'text/html'
        }
        else if (filePath.ext === '.png') {
            contentType = 'image/png'
        }
        else {
            contentType = 'text/plain'
        }
    }

    let finalPath;
    if (internalFile) {
        finalPath = fileName;
    }
    else {
        finalPath = path.join(BASE_PATH, fileName)
    }
    console.log('WebServer: serving file ', finalPath);

    let stream = fs.createReadStream(finalPath);

    stream.on('error', function() {
        res.writeHead(404);
        res.end();
    });

    res.writeHead(200, { 'Content-Type': contentType });

    stream.pipe(res);
}


const server = http.createServer((req, res) => {

  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    // Handle a file upload...
    const form = formidable({ keepExtensions: true, allowEmptyFiles: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
      }

      if (files?.multipleFiles?.originalFilename && files.multipleFiles.mimetype === 'application/zip') {
         let results = await ProjectLoader.handleFileUpload(files.multipleFiles)
         if (results.status === 200) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            let gbrjob = results.json.gbrjob;
            let projectId = gbrjob.GeneralSpecs.ProjectId.Name;
            let sideCount = gbrjob.FilesAttributes.length;
            let sizeX = gbrjob.GeneralSpecs.Size.X;
            let sizeY = gbrjob.GeneralSpecs.Size.Y
            res.end(`<html><body>Successfully received project ${projectId} (${sideCount} sides, ${sizeX} mm x ${sizeY} mm)</body></html>`);
         }
         else {
            res.writeHead(results.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results.json, null, 2));
         }
      }
      else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('.zip file not specified or is invalid.');
      }
    });
  }
  else if (req.url === '/logo.png') {
      // A request for the logo file...
      serveStaticFile(res, './qwick-splash-pro.png', 'image/png', true);
  }
  else {
      serveStaticFile(res, req.url)
  }

});

module.exports = {
    server,
    start: () => {
        server.listen(8080, () => {
            console.log('Server listening on http://localhost:8080/ ...');
          });
    }
}

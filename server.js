/**
 * Created with JetBrains WebStorm.
 * User: murat.zengin
 * Date: 5/31/12
 * Time: 9:50 AM
 * To change this template use File | Settings | File Templates.
 */

    var fs = require('fs');
    var http = require('http');

    http.createServer(function (req, res) {
    var client = http.createClient(3001, '127.0.0.1')
    var fileRequest = client.request('GET', '/welcome.png', {"host" : "127.0.0.1"})

        var fileType = "";
        fileRequest.on('response', function(response){
            console.log('STATUS: ' + response.statusCode);
            var headers = JSON.stringify(response.headers);
            console.log('HEADERS: ' + headers);
            fileType = response.headers["content-type"];

            var file = fs.createWriteStream('welcome.png');
            fileRequest.pipe(file);


            response.on('data', function(chunk){
                file.write(chunk);

            }).on('end', function(){
                    file.end();
                    var readStream = fs.createReadStream('welcome.png');
                    // This will wait until we know the readable stream is actually valid before piping
                    readStream.on('open', function () {
                        // This just pipes the read stream to the response object (which goes to the client)
                        readStream.pipe(res);
                        res.writeHead(200, {'Content-Type': fileType});
                        res.writeHead(200, {'Content-Disposition': 'attachment', 'filename' : 'welcome.png'});
                        //res.end();
                    });
                    readStream.on('close', function(){
                        fs.unlink('welcome.png')
                    })
                    // This catches any errors that happen while creating the readable stream (usually invalid names)
                    readStream.on('error', function(err) {
                        res.end(err);
                    });
            });
    })
    fileRequest.end();
}).listen(1337, '127.0.0.1');

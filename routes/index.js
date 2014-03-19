/*
 * GET home page.
 */

exports.index = function(req, res){

    var pageModel = { downloads: new Array()};
            // Get Model
        var mongoose = require('mongoose');
    var Schema = mongoose.Schema
        , ObjectId = Schema.ObjectId;

    var BlogPost = new Schema({
        id    : ObjectId
        , url       : String
        , ip        : String
        , bytes     : Number
        , fileName  : String
        , date      : Date
    });

    mongoose.model('BlogPost', BlogPost);
    //If I want to add an one comment into the BlogPost collection at the end I do something like this:
    mongoose.connect('mongodb://localhost/dbzget');
// retrieve my model
    var BlogPost = mongoose.model('BlogPost');

// create a blog post
    var post = new BlogPost();

BlogPost.find({}, ['id', 'url', 'ip', 'bytes', 'fileName', 'date'])
        .sort('date', -1) // DESC order
        .limit(15)
        .execFind( function(err, docs) {
            docs.forEach(function(doc){
                var obj = JSON.stringify({
                    url: doc.url,
                    ip: doc.ip,
                    bytes: doc.bytes,
                    id: doc.id,
                    fileName: doc.fileName,
                    date: doc.date
                });

                pageModel.downloads.push(obj);
            });

            mongoose.disconnect();
            res.render('index', { title: 'Zittirget file downloader', downloadList : pageModel.downloads  })
        });
};

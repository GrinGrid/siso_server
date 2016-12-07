/**!
 * response body 를 로깅하기 위한 모듈
 */
module.exports = resBodyLogger

function resBodyLogger(accessLogStream){

  return function logger(req, res, next){
    var end = res.end;
    var chunks = [];

    res.end = function newEnd(chunk) {
      if (chunk) { chunks.push(chunk); }
      end.apply(res, arguments);
    };

    res.once('finish', function logIt() {
      //var body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      //accessLogStream.write('[RESPONSE BODY]\n'+JSON.stringify(body, null, 4)+'\n\n');
      var body = Buffer.concat(chunks).toString('utf8');
      try{
        accessLogStream.write('[RESPONSE JSON BODY]\n'+JSON.stringify(JSON.parse(body), null, 4)+'\n\n');
      }catch(e){
        accessLogStream.write('[RESPONSE BODY]\n'+body+'\n\n');
      }
    });
    next();
  };
}

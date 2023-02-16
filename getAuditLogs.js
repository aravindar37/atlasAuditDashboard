exports = async function () {
    const atlasAdminAPIPublicKey = context.values.get("AtlasAdminAPIPublicKey");
    const atlasAdminAPIPrivateKey = context.values.get("AtlasAdminAPIPrivateKeyLinkToSecret");

    //   const awsAccessKeyID = context.values.get("AWSAccessKeyID")
    //   const awsSecretAccessKey = context.values.get("AWSSecretAccessKeyLinkToSecret")

    console.log(`Atlas Public + Private Keys: ${atlasAdminAPIPublicKey}, ${atlasAdminAPIPrivateKey}`);

    //////////////////////////////////////////////////////////////////////////////////////////////////

    // Atlas Cluster information
    const groupId = context.values.get("projectId");
    const host = context.values.get("atlasAPIhost");
    const logType = "mongodb-audit-log"; // the other option is "mongodb" -> that allows you to download database logs
    // defining startDate and endDate of Audit Logs
    const endDate = new Date();
    const durationInMinutes = 5;
    const durationInMilliSeconds = durationInMinutes * 60 * 1000;
    const startDate = new Date(endDate.getTime() - durationInMilliSeconds);

    const auditLogsArguments = {
        scheme: 'https',
        host: 'cloud.mongodb.com',
        path: `api/atlas/v1.0/groups/${groupId}/clusters/${host}/logs/${logType}.gz`,
        username: atlasAdminAPIPublicKey,
        password: atlasAdminAPIPrivateKey,
        headers: { 'Content-Type': ['application/json'], 'Accept-Encoding': ['application/gzip'] },
        digestAuth: true,
        query: {
            "startDate": [Math.round(startDate / 1000).toString()],
            "endDate": [Math.round(endDate / 1000).toString()]
        }
    };

    console.log(`Arguments:${JSON.stringify(auditLogsArguments)}`);

    var response = await context.http.get(auditLogsArguments);
    auditData = response.body;
    response = null;
    console.log("AuditData:" + (auditData));
    console.log("JS Type:" + typeof auditData);

    var bufferAuditData = await Buffer.from(auditData.toBase64(), 'base64');
    auditData = null;

    var zlib = require('zlib');

    var unzipped = zlib.gunzipSync(bufferAuditData).toString('utf8');
    bufferAuditData = null;
    console.log("unzipped:" + (unzipped));

    let parsed_log_summary = [];

    const es = require('event-stream');
    const fs = require('fs');
    const { Readable } = require("stream")
    var stream = new Readable()
    stream.push(unzipped)    // the string you want
    stream.push(null)      // indicates end-of-file basically - the end of the stream
    stream
        .pipe(es.split())
        .pipe(es.mapSync(function (log_line) {
            // Pause the log stream to process the line
            stream.pause();
            var validJson = false;
            try {
                var o = JSON.parse(log_line);
                if (o && typeof o === "object") {
                    validJson = true;
                    o = null;
                }
            }
            catch (e) { }

            // Ignore if log line is empty or null
            if (validJson) {
                // Parse Log Line to JSON
                //console.log(log_line);
                let log = JSON.parse(log_line);
                parsed_log_summary.push(log);
            }
            // resume the read stream, possibly from a callback
            stream.resume();
        }))
        .on('error', function (err) {
            console.log(err);
        })
        .on('end', async function () {
            console.log("Sending data to database");
            context.services.get("cluster0").db("contReview").collection("auditLog").insertMany(parsed_log_summary)
                .then(result => console.log(`Successfully inserted items with _id: ${EJSON.stringify(result)}`))
                .catch(err => console.error(`Failed to insert items: ${err}`));
        });

    var auditDoc = { "value": unzipped };


    return "executed";
};

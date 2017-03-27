'use strict';
var moment = require('moment');
var Promise = require('bluebird');
var fs = require('fs');
Promise.promisifyAll(fs);

//caching directories by interval specified in reader
var dirs = {};

function newProcessor(context, opConfig, jobConfig) {
    var path = parsePath(opConfig.path);

// TODO: currently making dirs by date, need to allow other means
    makeFolders(context, opConfig, jobConfig);

    function findPath(msg) {
        var filePath;
        if (msg.start) {
            if (dirs[msg.start]) {
                filePath = path + msg.start + '/' + msg.start;
            }
            else {
                filePath = path + findDir(path, msg) + '/' + msg.start;
            }
        }
        else {
            //TODO save to disk by some other factor besides date
        }

        return filePath
    }

    function json_lines(data, sliceLogger, msg) {
        var filePath = findPath(msg);
        return Promise.map(data, function(doc) {
            fs.appendFileAsync(filePath, JSON.stringify(doc) + '\n')
        });

    }

    function json_array(data, sliceLogger, msg) {
        var filePath = findPath(msg);
        var transformData = processData(data, opConfig);

        return fs.writeFileAsync(filePath, transformData)
    }

    if (opConfig.output_format === 'json_array') {
        return json_array
    }

    return json_lines

}

function processData(data, op) {
    if (op.elastic_metadata === undefined) {
        return JSON.stringify(data);
    }
    else {
        if (op.elastic_metadata) {
            return JSON.stringify(data.hits.hits);
        }
        else {
            var finalData = data.hits.hits.map(function(obj) {
                return obj._source;
            });

            return JSON.stringify(finalData);
        }
    }
}

function findDir(path, date) {
    var dirsArray = fs.readdirSync(path);
    var dateStart = new Date(date.start);

    for (var i = 0; i < dirsArray.length; i++) {
        var dirDate = new Date(dirsArray[i]);

        if (dirsArray[i + 1]) {
            var nextDir = new Date(dirsArray[i + 1]);

            if (dirDate <= dateStart && dateStart < nextDir) {
                return dirsArray[i];
            }
        }
        else {
            if (dirDate <= dateStart) {
                return dirsArray[i];
            }
        }

    }
}

function parsePath(path) {
    var length = path.length;
    var parsedPath = path[length - 1] === '/' ? path : path + '/';

    return parsedPath;
}

function mkdirSync(path) {
    try {
        fs.mkdirSync(path);
    }
    catch (e) {
        if (e.code != 'EEXIST') {
            throw e;
        }
    }
}
function getInterval(op, jobConfig) {
    var interval = jobConfig.operations
        .filter(function(op) {
            return op.interval
        })
        .map(function(op) {
            return op.interval
        })[0];

    try {
        return processInterval(interval)
    }
    catch (err) {
        return op.default_interval
    }
}

//this is working for date based jobs, need to refactor
function makeFolders(context, op, jobConfig) {
    var logger = context.logger;
    logger.info('Creating directories ...');

    var path = parsePath(op.path);
    var interval = getInterval(op, jobConfig);
    var start = moment(op.start).startOf(interval[1]);
    var limit = moment(op.end).endOf(interval[1]);

    while (start <= limit) {
        var str = start.format();
        dirs[str] = true;
        mkdirSync(path + str);
        start.add(interval[0], interval[1]);
    }

    logger.info('Directories have been made');
}

function dateOptions(value) {
    var timeInterval = value.toLowerCase();
    var options = {
        year: 'y', years: 'y', 'y': 'y',
        months: 'M', month: 'M', mo: 'M', mos: 'M', M: 'M',
        weeks: 'w', week: 'w', wks: 'w', wk: 'w', w: 'w',
        days: 'd', day: 'd', d: 'd',
        hours: 'h', hour: 'h', hr: 'h', hrs: 'h', h: 'h',
        minutes: 'm', minute: 'm', min: 'm', mins: 'm', m: 'm',
        seconds: 's', second: 's', s: 's',
        milliseconds: 'ms', millisecond: 'ms', ms: 'ms'
    };

    if (options[timeInterval]) {
        return options[timeInterval];
    }
    else {
        throw new Error('date interval is not formatted correctly')
    }
}

function processInterval(str) {
    if (!moment(new Date(str)).isValid()) {
        //one or more digits, followed by one or more letters, case-insensitive
        var regex = /(\d+)([a-z]+)/i;
        var interval = regex.exec(str);
        if (interval === null) {
            throw  new Error('teraslice_file_export interval and/or delay are incorrectly formatted. Needs to follow ' +
                '[number][letter\'s] format, e.g. "12s"')
        }

        //dont need first parameter, its the full string
        interval.shift();

        interval[1] = dateOptions(interval[1]);
        return interval;
    }
    else {
        throw  new Error('teraslice_file_export interval and/or delay are incorrectly formatted. Needs to follow ' +
            '[number][letter\'s] format, e.g. "12s"')
    }
}


function schema() {
    return {
        path: {
            doc: 'path to directory where the data will be saved to, directory must pre-exist',
            default: null,
            format: 'required_String'
        },
        elastic_metadata: {
            doc: 'set to true if you would like to save the metadata of the doc to file',
            default: false,
            format: Boolean
        },
        output_format: {
            doc: 'format in which it exports the data to a file, json_array is a single entity, or json_lines where each record is on a new line',
            default: 'json_array',
            format: ['json_array', 'json_lines']
        },
        default_interval: {
            doc: 'If a interval setting is not found in elasticsearch_reader, or is set to auto, it will use this default interval instead',
            default: '1h',
            format: function(val) {
                processInterval(val)
            }
        },
        start: {
            doc: 'The start date (ISOstring or in ms) to which directories will start from',
            default: null,
            format: function(val) {
                if (val) {
                    if (typeof val === 'string' || typeof val === 'number') {
                        if (!moment(new Date(val)).isValid()) {
                            throw new Error("value: " + val + " cannot be coerced into a proper date")
                        }
                    }
                    else {
                        throw new Error('parameter must be a string or number IF specified')
                    }
                }
            }
        },
        end: {
            doc: 'The end date (ISOstring or in ms) to which directories will be made',
            default: null,
            format: function(val) {
                if (val) {
                    if (typeof val === 'string' || typeof val === 'number') {
                        if (!moment(new Date(val)).isValid()) {
                            throw new Error("value: " + val + " cannot be coerced into a proper date")
                        }
                    }
                    else {
                        throw new Error('parameter must be a string or number IF specified')
                    }
                }
            }
        }
    };
}

module.exports = {
    newProcessor: newProcessor,
    schema: schema,
    processData: processData,
    findDir: findDir,
    parsePath: parsePath,
    mkdirSync: mkdirSync,
    makeFolders: makeFolders
};

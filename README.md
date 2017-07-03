TODO: this module is subject to refactoring to make it more generic. Currently it's too tied to elasticsearch outputs and is dependent on the records having dates.

# Processor - teraslice_file_export

To install from the root of your teraslice instance.

```
npm install terascope/teraslice_file_export
```

# Description

Writes the output of the job at the provided path.

# Expected Inputs

Array of records in JSON format

# Output

Currently undefined


# Job configuration example

Export the data from `logs-*` for the specified date range and store to files in /tmp/export grouped into directories with 1 days data.

```
{
    "name": "Export index",
    "lifecycle": "once",
    "workers": 2,
    "operations": [
        {
          "_op": "elasticsearch_reader",
          "index": "logs-*",
          "start": "2016-02-01T00:00:00Z",
          "end": "2016-08-28T23:59:59Z",
          "size": 10000,
          "date_field_name": "date"
        },
        {
            "_op": "teraslice_file_export",
            "path": "/tmp/export",
            "output_format": "json_lines",
            "default_interval": "1d",
            "start": "2014-02-01T00:00:00Z",
            "end": "2014-08-28T23:59:59Z"
        }
    ]
}
```


# Configuration

| Configuration | Description | Type |  Notes
|:---------: | :--------: | :------: | :------:
path | path to directory where the data will be saved to, directory must pre-exist | String | required
elastic_metadata | if set to true then the associated elasticsearch metadata of each doc will be written to file| Boolean | optional, defaults to false
format | format in which it exports the data to a file. If set to json_array then it saves it as an array, or if set to json_lines then each record is separated by a new line | String | optional, defaults to json_lines
default_interval | If a interval setting is not found in elasticsearch_reader, or is set to auto, it will use this default interval instead. Used to make chunks and the range of each folder | String | optional, defaults to '1h'. This follows npm module moment.js semantics
start | The start date (ISOstring or in ms) to which directories will start from | String or Number | optional
end | The end date (ISOstring or in ms) to which directories will start from | String or Number | optional


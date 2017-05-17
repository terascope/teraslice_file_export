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

# Parameters

| Name | Description | Default | Required |
| ---- | ----------- | ------- | -------- |
| path | path to directory where the data will be saved to, directory must pre-exist |  | Y |
| elastic_metadata | set to true if you would like to save the metadata of the doc to file | false | N |
| output_format | format in which it exports the data to a file, json_array is a single entity, or json_lines where each record is on a new line | json_array | N |
| default_interval | If a interval setting is not found in elasticsearch_reader, or is set to auto, it will use this default interval instead | 1h | N |
| start | The start date (ISOstring or in ms) to which directories will start from |  | Y |
| end | The end date (ISOstring or in ms) to which directories will be made |  | Y |


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

# Notes

This module trys to output data into directories grouped by date ranges.

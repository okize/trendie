[![NPM version](http://img.shields.io/npm/v/trendie.svg?style=flat)](https://www.npmjs.org/package/trendie)
[![Dependency Status](http://img.shields.io/david/okize/trendie.svg?style=flat)](https://david-dm.org/okize/trendie)
[![Downloads](http://img.shields.io/npm/dm/trendie.svg?style=flat)](https://www.npmjs.org/package/trendie)

# Trendie

CLI tool that displays Internet Explorer usage and trends for your site via Google Analytics.

Displays visits from the last month, 6 months ago and 1 year ago (1 month = 4 weeks = 28 days to avoid low-traffic weekend bias).

## Example

```
$ trendie get 123456789
```

<img src="http://okize.github.com/trendie/img/trendie-screenshot.png" alt="trendie screenshot" style="width: 500px;"/>

## Installation

### Installing via npm (node package manager)

```
  $ [sudo] npm install -g trendie
```

### Clone & Hack

The source is available for download from [GitHub](https://github.com/okize/trendie).

```
  $ git clone git@github.com:okize/trendie && cd trendie
  $ npm install
```

## Usage

### Set credentials
To use trendie, you must first setup your Google Analytics credentials.
```
  $ trendie set-user
```
You will then be prompted for a username & password. Rerunning this command will overwrite any existing user info.

### Supply a Google Analytics profile ID
```
  $ trendie get 123456789
```
Where 123456789 is a GA profile ID that the supplied user credentials has permissions for.

[How do I find my profile ID?](https://developers.google.com/analytics/resources/concepts/gaConceptsAccounts)

## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

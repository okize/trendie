#!/usr/bin/env node

var program = require('commander');
var levelup = require('level');
var db = levelup('./config');

program
  .version('0.0.1')
  .option('-g, --gaId <gaid>', 'GA id of account to access');


// $ trendie set-user
program
  .command('set-user [username]')
  .description('set the Google Analytics user name')
  .action(function (username) {

      if (!username) {
        return console.log('please enter a username');
      }

      return db.put('username', username, function (err) {
        if (err) return console.log('please try again', err); // some kind of I/O error
      });

    });

// $ trendie set-pass
program
  .command('set-pass [password]')
  .description('set the Google Analytics password')
  .action(function (password) {

      if (!password) {
        return console.log('please enter a password');
      }

      return db.put('password', password, function (err) {
        if (err) return console.log('please try again', err); // some kind of I/O error
      });

    });

// temporary
// $ trendie show
program
  .command('show')
  .description('show the Google Analytics configuration')
  .action(function () {

    return db.get('username', function (err, username) {

      db.get('password', function (err, password) {

        // the key was not found
        if (err) return console.log('either username or password has not been set');

        console.log('username: ' + username + '\npassword: ' + password);

      });

    });

  });

program.parse(process.argv);
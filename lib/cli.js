// required modules
var path = require('path-extra'),
    program = require('commander'),
    Datastore = require('nedb'),
    _ = require('lodash'),
    colors = require('colors'),
    prompt = require('prompt');

// local vars
var trendie = require(path.resolve(__dirname, '..', 'lib', 'app')),
    pkg = require(path.resolve(__dirname, '..', 'package.json')),
    homedir = path.homedir(),
    configFile = path.resolve(homedir, '.trendie'),
    db = new Datastore({ filename: configFile, autoload: true }),
    debugMode = false;

// program flags
program
  .version(pkg.version)
  .option('-d, --debug', 'display raw GA object instead of table output');

// $ trendie get
program
  .command('get [profileId]')
  .description('get Internet Explorer trends for a Google Analytics profile')
  .action(function (profileId) {

    if (!profileId) {
      return console.error('please enter the Google Analytics profile ID you wish to view (ie. 187623632)');
    }

    // get the active user
    db.findOne({ active: true }, function (err, user) {

      if (err || user === null) {
        return console.error('no user has not been set'.red);
      }

      if (user.password === '' || user.password === null) {
        return console.error('a password has not been set'.red);
      }

      if (program.debug === true) {
        debugMode = true;
      }

      return trendie.getTrends(profileId, user.username, user.password, debugMode);

    });

  });

// $ trendie set-user
program
  .command('set-user')
  .description('set the Google Analytics username & password')
  .action(function () {

    var schema = {
      properties: {
        username: {
          description: 'Enter your username:',
          required: true,
          type: 'string',
        },
        password: {
          description: 'Enter your password:',
          required: true,
          type: 'string',
          hidden: true
        }
      }
    };

    // open prompt
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, function (err, result) {

      if (err) {
        return console.error('\ncould not save username or password'.red);
      }

      // set all accounts active to false
      db.update({ active: true }, { $set: { active: false } }, { multi: true },
        function (err, updatedCount) {

          if (err) {
            return console.error('\nerror trying to update username or password'.red);
          }

          // update or add new account information
          db.update(
            { username: result.username },
            {
              username: result.username,
              password: result.password,
              active: true
            },
            { upsert: true },
            function (err, numReplaced) {

              if (err) {
                return console.error('\nerror trying to update username or password'.red);
              }

              if (numReplaced === 1) {
                return console.log('username & password have been saved!'.green);
              } else {
                return console.error('\nsomething has gone horribly wrong'.red);
              }

            }
          );

        }
      );

    });

  });

// $ trendie show
program
  .command('show-user')
  .description('show the Google Analytics user that has been set')
  .action(function () {

    db.findOne({ active: true }, function (err, user) {

      if (err) {
        console.error(err);
      }

      if (user === null) {
        return console.error('no user has been set!'.red);
      } else {
        return console.log(user.username);
      }

    });

  });

program.parse(process.argv);

// show help by default
if (!program.args.length) {

  program.parse([process.argv[0], process.argv[1], '-h']);
  process.exit(0);

}
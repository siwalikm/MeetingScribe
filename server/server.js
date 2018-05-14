const express = require('express');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const usersRouter = require('../routes/users');
const indexRouter = require('../routes/index');
const meetingsRouter = require('../routes/meeting');
const taskRouter = require('../routes/task');

const expressApp = class ExpressServer {

  constructor(options = {}) {
    const app = express();
    ExpressServer.viewEngineSetup(app, options);
    ExpressServer.setupRoutes(app, options);
    ExpressServer.errorSetup(app, options);
    ExpressServer.setupApp(app, options);
  }

  static viewEngineSetup(app, options) {
    app.set('views', path.join(__dirname, '../views'));
//    app.set('view engine', 'pug');

    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'html');

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
  };

  static setupRoutes(app, options) {
    app.use('/', indexRouter);
    app.use('/users', usersRouter);
    app.use('/meeting', meetingsRouter);
    app.use('/task', taskRouter);
  }

  static setupApp(app, options) {
    app.listen(5000);
    global.expressApp = app;
  }

  static errorSetup(app, options) {
    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      next(createError(404));
    });

    // error handler
    app.use(function(err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.json({error: err});
    });
  };
};

module.exports = expressApp;


var express = require('express');
var fortune = require("./lib/fortune.js");
var credentials = require('./credentials.js');
var app = express();

//设置handlebars 视图引擎
var handlebars = require('express3-handlebars').create({defaultLayout:'main'});
app.engine('handlebars',handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port',process.env.PORT || 3000);

app.use(function(req, res, next){
	res.locals.showTests = app.get('env') !== 'production' && req.query.test == '1';
	next();
});

app.use(express.static(__dirname + '/public'));

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')());

app.use(function(req, res, next){
	//如果有即显消息，把它传到上下文中，然后清除它
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
})

app.get('/', function(req, res){
	res.render('home');
});

app.get('/about', function(req,res){
	var randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
	//res.render('about',{fortune: fortune.getFortune(),pageTestScript: '/qa/tests-about.js'});
	res.render('about',{fortune:randomFortune});
});

app.get('/tours/hood-river',function(req,res){
	res.render('tours/hood-river');
});

app.get('/tours/request-group-rate',function(req, res){
	res.render('tours/request-group-rate');
});

app.use(require('body-parser')());
app.get('/newsletter',function(req,res){
	var name = req.body.name || '', email = req.body.email || '';
	//输入验证
	var VALID_EMAIL_REGEX = "dfasdf";
	if (!email.match(VALID_EMAIL_REGEX)) {
		if (req.xhr) {return res.json({ error: 'Invalid name email address.'});};
		req.session.flash = {
			type:'danger',
			intro: 'Validation error!',
			message: 'The email address you entered was not valid.',
		};
		return res.redirect(303,'/newsletter/archive');
	};
	new NewsletterSignup({name:name, email: email}).save(function(err){
		if (err) {
			if (req.xhr) {return res.json({error: 'Database error.'});};
			req.session.flash = {
				type:'danger',
				intro: 'Database error!',
				message: 'There was a database error; please try again later.',
			}
			return res.redirect(303,'/newsletter/archive');
		};
		if (req.xhr) {return res.json({success: true});};
		req.session.flash = {
			type:'success',
			intro: 'Thank you!',
			message: 'You have now been signed up for the newsletter.',
		};
		return res.redirect(303,'/newsletter/archive');
	});
	// res.render('newsletter',{csrf:'CSRF token goes here'});
});

app.post('/process',function(req,res){
	if (req.xhr || req.accepts('json,html')==='json') {
		//如果发生错误，应该发送{error: 'error description'}
		res.send({success:true});
	}else{
		//如果发生错误，应该重定向到错误页面
		console.log('Form(from querystring): '+req.query.form);
		console.log('CSRF token (from hidden form field): '+ req.body._csrf);
		console.log('Name (from visible form field): '+ req.body.name);
		console.log('Email (from visible form field: '+ req.body.email);
		res.redirect(303,'/thank-you');	
	}
	
});

var formidable = require('formidable');
app.get('/contest/vacation-photo',function(req,res){
	var now = new Date();
	res.render('contest/vacation-photo',{
		year: now.getFullYear(), month:now.getMonth()
	});
});

app.post('/contest/vacation-photo/:year/:month',function(req,res){
	var form = new formidable.IncomingForm();
	form.parse(req,function(err,fields,files){
		if (err) {return res.redirect(303,'/error')};
		console.log('received fields: ');
		console.log(fields);
		console.log('received files: ');
		console.log(files);
		res.redirect(303,'/thank-you');
	});
});

var jqupload = require('jquery-file-upload-middleware');
app.use('/upload',function(req, res, next){
	var now = Date.now();
	jqupload.fileHandler({
		uploadDir: function(){
			return __dirname + '/public/uploads/' + now;
		},
		uploadUrl: function(){
			return '/uploads/' + now;
		},
	})(req, res, next);
});


//定制404页面
app.use(function(req, res, next){
	res.status(404);
    res.render('404');
});

//定制500页面
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'),function(){
	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl - C to rerminate.');
});

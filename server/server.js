////////SETUP////////
var superAdminEmail = "george.strakhov@gmail.com"; //FB email of the superadmin; only the user with this email will be able to change userRoles for other users.

var localhostFacebook = {
  appId: "174600052663913",
  secret: "7bb35acfdbd98488cdcf9fc6af6898e6"
};

var remoteFacebook = {
  appId: "287139741389729",
  secret: "2d1be2a7fb1f40b68024549328988e21"
};

////////INITIALIZE//////////

Accounts.onCreateUser(function(options, user) {
  user.userRole = "user";
  // We still want the default hook's 'profile' behavior.
  if (options.profile)
    user.profile = options.profile;
  if(user.services.facebook.email == superAdminEmail) {
    user.userRole = "superAdmin";
  }
  if(Meteor.users.findOne({displayName: user.profile.name})) {
    user.displayName = user.profile.name+Math.floor(Math.random()*1100);
  } else {
    user.displayName = user.profile.name;
  }
  user.email = user.services.facebook.email;
  Email.send({
    from : "telescopicbrief@gmail.com",
    to : user.email,
    subject: "welcome",
    html: '<!DOCTYPE HTML><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><body><p>welcome to '+Meteor.absoluteUrl()+'</p></body></html>',
  });
  //console.log(user);
  return user;
});

////////STARTUP//////////
Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    if(Meteor.absoluteUrl() == "http://localhost:3000/") {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : localhostFacebook.appId, //this is for localhost
        secret : localhostFacebook.secret //this is for localhost
      });
    } else {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : remoteFacebook.appId, //put appId of the FB app for deployed
        secret : remoteFacebook.secret //put secret of the FB app for deployed 
      });    
    }
    console.log("configured facebook login");
  }
});

////////PUBLISH//////////
Meteor.publish("briefs", function() {
  return Briefs.find({owners:this.userId});//we only publish user's own briefs. If the anonymous or another user accesses a brief by id - we pass this exact brief back via a call result
});


///////METHODS///////////

Meteor.methods({
  'createNewBrief' : function(name, isProtected, password, userEmail, forkedFrom) {
    if(!name) {
      throw new Meteor.Error('403', 'name not passed');
      return;
    }
    name = name.toString();
    if(Briefs.findOne({name: name})) {
      throw new Meteor.Error('403', 'A brief with such name already exists. Please choose a different name');
      return;
    }
    if(forkedFrom) {
      if(!Briefs.findOne(forkedFrom)) {
        throw new Meteor.Error('403', 'Can\'t fork from a brief that doesn\'t exist');
        return;
      }
    }
    if(!isProtected) {
      password = undefined;
    }
    if(this.userId) {
      var createdBy = Meteor.users.findOne(this.userId).displayName;
    } else {
      var createdBy = userEmail;
    }
    var d = new Date();
    newBriefId = Briefs.insert({
      lastModified: d.getTime(),
      owners: (this.userId) ? [this.userId] : [],
      passwordProtected: (password) ? true : false,
      password: (password) ? password : undefined,
      name: name,
      createdBy: createdBy,
      forkedFrom: (forkedFrom) ? forkedFrom : undefined,
      defaultView: "telescopic",
      content: {}
    });
    return newBriefId;
  },
  'lookUpBrief' : function(name, password) {
    if(!name || !Briefs.findOne({name: name})) {
      throw new Meteor.Error('404', 'such brief doesn\'t exist');
      return;
    }
    var b = Briefs.findOne({name: name});
    if(!b.passwordProtected) {
      return b;
    } else if(password && b.password == password) {
      return b;
    } else if (password && !(b.password == password)) {
      throw new Meteor.Error('403', 'wrong password, try again');
      return;
    } else {
      return "password required";
    }
  }
});

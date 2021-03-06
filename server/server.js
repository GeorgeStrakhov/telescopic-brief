////////SETUP////////
var superAdminEmail = "george.strakhov@gmail.com"; //FB email of the superadmin; 

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
  return Briefs.find({$or:[{owners:this.userId}, {readers: this.userId}]});//we only publish user's own briefs. If the anonymous or another user accesses a brief by id - we pass this exact brief back via a call result
});


///////METHODS///////////

Meteor.methods({
  'createNewBrief' : function(name, isProtected, password, userEmail, forkedFrom) {
    if(!name) {
      throw new Meteor.Error('403', 'name not passed');
      return;
    }
    if(userEmail && userEmail != "") {
      var re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
      if(!re.test(userEmail)){
        throw new Meteor.Error('403', 'email seems to be invalid');
        return;
      }
    }
    name = name.toString();
    if(Briefs.findOne({name: name})) {
      throw new Meteor.Error('403', 'A brief with such name already exists. Please choose a different name');
      return;
    }
    if(forkedFrom) {
      if(!Briefs.findOne({name: forkedFrom})) {
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
    var origin = {};
    if(forkedFrom && Briefs.findOne({name: forkedFrom})) {
      origin = Briefs.findOne({name: forkedFrom});
    }
    if(origin.content) {
      origin.content.briefDisplayName = name;
    } else {
      origin.content = {};
      origin.content.briefDisplayName = name;
    }
    var d = new Date();
    newBriefId = Briefs.insert({
      lastModified: d.getTime(),
      owners: (this.userId) ? [this.userId] : [],
      readers: (this.userId) ? [this.userId] : [],
      passwordProtected: (password) ? true : false,
      password: (password) ? password : undefined,
      name: name,
      createdBy: createdBy,
      forkedFrom: (origin._id) ? origin._id : undefined,
      defaultView: (origin.defaultView) ? origin.defaultView : "paragraph",
      content: origin.content
    });
    if(!this.userId && !(userEmail =="")) {//not a user - send an email with links to view and edit
      Email.send({
        from : "telescopicbrief@gmail.com",
        to : userEmail,
        subject: "Your new Telescopic Brief",
        html: '<!DOCTYPE HTML><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><body><p>Thanks for checking out <a href="'+Meteor.absoluteUrl()+'">Telescopic Brief</a></p><p>You can view your new brief <a href="'+Meteor.absoluteUrl()+'#/brief/'+name+'"here</a>.</p><p>You can also edit your new brief using <a href="'+Meteor.absoluteUrl()+'#/edit/'+newBriefId+'">this secret link</a>. But don\'t tell it to anybody else, unless you want them to be able to edit this brief as well.</p><p>Next time around make sure you sign in with Facebook, so that you can later view all your briefs in one place, edit them and more.</p><p>Have fun!</p><p>Best,</p><p><a href="'+Meteor.absoluteUrl()+'">Telescopic Brief</a></p></body></html>',
      });
    }
    return newBriefId;
  },
  'lookUpBrief' : function(loadBy, name, id, password) {
    if(loadBy == "name") {
      if(!name || !Briefs.findOne({name: name})) {
        throw new Meteor.Error('404', 'such brief doesn\'t exist');
        return;
      }
      var mine = Briefs.findOne({name: name, owners: this.userId});
      if(mine) {
        return mine;
      }
      var mine = Briefs.findOne({name: name, readers: this.userId});
      if(mine) {
        mine._id = undefined; //NB! don't give away brief _id to readers
        return mine;
      }
      var b = Briefs.findOne({name: name});
      b._id = undefined; // NB! don't give away biref _id to strangers
    } else if(loadBy =="id") { //loading by ID is secret, so we just give this brief.
      if(!id || !Briefs.findOne(id)) {
        throw new Meteor.Error('404', 'such brief doesn\'t exist');
        return;
      }
      var b = Briefs.findOne(id);
      return b;
    }
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
  },
  'updateBrief' : function(briefId, key, value) {
    //console.log(briefId+","+key+","+value);
    if(!briefId || !key) {
      throw new Meteor.Error('403', 'brief id or key not passed');
      return;
    }
    var b = Briefs.findOne(briefId);
    if(!b) {
      throw new Meteor.Error('404', 'the brief you\'re trying to update doesn\'t exist any more');
      return;
    }
    if(value) {
      b.content[key] = value;
    } else {
      b.content[key] = undefined;
    }
    var d = new Date();
    b.lastEdited = d.getTime();
    Briefs.update(b._id, b);
    return Briefs.findOne(b._id);
  },
  'changeDefaultView' : function(id, view) {
    if(!view) {
      throw new Meteor.Error('403', 'no view passed');
      return;
    }
    if(!(view=='telescopic' || view=='table' || view=='presentation' || view=='paragraph')) {
      throw new Meteor.Error('403', 'incorrect view passed');
      return;
    }
    if(!id || !Briefs.findOne(id)) {
      throw new Meteor.Error('404', 'brief not found');
      return;
    }
    Briefs.update(id, {$set: {defaultView: view}});
    return 'default view successfully updated';
  },
  'changeBriefPass' : function(id, pass) {
    if(!id || !Briefs.findOne(id)) {
      throw new Meteor.Error('404', 'brief not found');
      return;
    }
    if(pass) {
      Briefs.update(id, {$set: {passwordProtected: true}});
      Briefs.update(id, {$set: {password: pass}});
      return 'password successfully updated';
    } else {
      Briefs.update(id, {$set: {passwordProtected: false}});
      Briefs.update(id, {$set: {password: undefined}});   
      return 'this brief is now accessible without a password';
    }
  },
  'deleteBrief' : function(id) {
    if(!id) {
      throw new Meteor.Error('403', 'no brief id passed');
      return;
    }
    if(!Briefs.findOne(id)) {
      throw new Meteor.Error('404', 'this brief has already been deleted');
      return;
    }
    Briefs.remove(id);
    return 'brief successfully deleted';
  }
});

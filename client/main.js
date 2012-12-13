///////SETUP//////


//pines notify
var interval = false;
$.pnotify.defaults.history = false;
consume_alert(); //to override normal alert behavior

//////////SITE-WIDE HELPER FUNCTIONS/////////

function consume_alert() { //to override normal alert behavior
    if (_alert) return;
    var _alert = window.alert;
    window.alert = function(message) {
        $.pnotify({
            text: message
        });
    };
};

function notifyCallRes(error, result) {
  if(error)
    notify('error', error.reason);
  if(result)
    notify('success', result);
};

function notify(type, message) {
  $.pnotify({
    text: message,
    type: type
  });
};

function loading(doWhat) {
  if(doWhat == "show")
    $("#loading").show();
  if(doWhat == "hide")
    $("#loading").hide();
};

function loadBrief(loadBy, name, id, pass, goWhere) {
  loading('show');
  Meteor.setTimeout(function(){
    Meteor.call('lookUpBrief', loadBy, name, id, pass, function(error, result) {
      loading('hide');
      if(error) {
        //console.log(error);
        if(error.error == "404") {
          Session.set('view', '404');      
        } else {
          notify('error', error.reason);
        }
      } else {
        if(result) {
          //console.log(result);
          if(result == "password required") {
            Session.set('currentBriefName', name);
            Session.set('currentBriefId', id);
            Session.set('view', 'enterPassword');
          } else {
            console.log(result);
            Session.set('brief', result);
            if(goWhere == "edit") {
              Session.set('view', 'edit');
            } else {
              Session.set('view', result.defaultView);
            }
          }
        }
      }
    })}, 1000); //can we fix this to be better than a fixed number of milliseconds? otherwise error is shown first.
};


///////SUBSCRIBE///////////
Meteor.subscribe("briefs");

////////////REACTIVE AUTOSUBSCRIBE HELPERS//////////

///////////SITE-WIDE HANDLEBARS HELPERS//////////
Handlebars.registerHelper('view', function(which) {
  return Session.get('view') == which;
});

Handlebars.registerHelper('brief', function() {
  return Session.get('brief');
});

Handlebars.registerHelper('myBriefs', function() {
  if(Meteor.user()) {
    return Briefs.find();
  }
});

Handlebars.registerHelper('editStep', function(which) {
  return Session.get('editStep') == which;
});


//////////TEMPLATE LOGIC//////////
Template.welcome.events = {
  'click #signInWithFB' : function() {
    loading('show');
    Meteor.loginWithFacebook(function() {
      loading('hide');
      Session.set('view', 'myApp');
    });
  },
};

Template.createNew.events = {
  'click #createNewBtn' : function(e) {
    e.preventDefault();
    if(!$("#briefName").val() || $("#briefName").val() == "") {
      notify('error', 'Name can\'t be empty');
      return;
    }
    if($("#passwordProtect").is(':checked') && $("#briefPassword").val() == "") {
      notify('error', 'Password can\'t be empty');
      return;
    }
    loading('show');
    Meteor.call('createNewBrief', $("#briefName").val(), $("#passwordProtect").is(':checked'), $("#briefPassword").val(), $("#userEmail").val(), false, function(error,result) {    
      if(error) {
        notifyCallRes(error,null);
        loading('hide');
        return;
      } else {
        if(result) { //result is the _id of the new brief. edit links are always "secret" through the use of _id
          Router.navigate("#/edit/"+result, true);
        }
      }
    });
  },
  'change #passwordProtect' : function() {
    $("#passFieldDiv").toggle('fast');
  },
};

Template.enterPassword.events = {
  'click #sendPass' : function(e) {
    e.preventDefault();
    var name = Session.get("currentBriefName");
    var id = Session.get("currentBriefId");
    var pass = $("#briefPass").val();
    var goWhere = Session.get("goWhere");
    if(!pass || pass == "") {
      notify('error', 'password can\'t be blank');
      return;
    }
    if(name) {
      loadBrief("name", name, null, pass, goWhere);
    } else if(id) {
      loadBrief("id", null, id, pass, goWhere); 
    } else {
      notify('error', 'sorry, something went wrong...');
    }
  },
};

Template.edit.events = {
  'click .accordion-toggle': function(e) {
    //save changes
    //change url part
    var which = e.target.id;
    history.pushState(null, null, "#/edit/"+Session.get('brief')._id+"/"+which);
  },
};

//////////ROUTER///////////
var myRouter = Backbone.Router.extend({
  routes: {
    "brief/:name": "brief",
    "new": "createNew",
    "edit/:id/step:step" : "edit",
    "pdf" : "pdf",
    "": "main",
    "*stuff": "page404"
  },
  main: function() {
    if(Meteor.userId()) {
      Session.set('view', 'myApp');
    } else {
      Session.set('view', 'welcome');
    }
  },
  edit: function(id,step) {
    if(step && step>0 && step<8){
      Session.set('editStep', step);
    } else {
      Session.set('editStep', "1");
    }
    Session.set('goWhere', 'edit');
    loadBrief("id", null, id, null, "edit");
  },
  brief: function(name) {
    Session.set('goWhere', 'brief');
    loadBrief("name", name, null, null, "brief");
  },
  pdf: function() {
    Session.set('view', 'pdf');
  },
  createNew: function() {
    Session.set('view', 'createNew');
  },
  page404: function() {
    Session.set('view', '404');
    console.log('404');
  }

});

Router = new myRouter;

Meteor.startup(function () {
  Backbone.history.start();
});

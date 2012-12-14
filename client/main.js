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
            //console.log(result);
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

function saveEditChanges(key, value) { //key - fieldName, value - new value
  //console.log(key+':'+value);
  key = key.toString();
  //console.log(value);
  var b = Session.get('brief');
  //first we need to first update the local (Session.get('brief'))
  b.content[key] = value;
  Session.set('brief', b);  
  //second we need to send the update to the server via Meteor.call('updateBrief', key, value); - optionally we can notify the user that all the changes have been saved (callback from Meteor.Call)
  
  //FIX show little loading spinner

  Meteor.call('updateBrief', b._id, key.toString(), value, function(error, result) {
    if(error)
      notify('error', error.reason);
    if(result) {
      //FIX here we need to hide the little loading spinner
    }
  });
};

function markdownFromArray(data) { //generates markdown (not really markdown, just new lines for now) from an array that is passed to it 
    //console.log(data);
    var md = "";
    //console.log(data);
    if(data && data[0]) {
      for(i = 0; i<data.length-1; i++) {
        md += "* "+data[i]+"\r\n";
      }
      md+= "* "+data[data.length-1];
    } else {
      md += "(type here, each new line will become a new item)";
    }
    return md;
}

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

Handlebars.registerHelper('content', function() {
  var b = Session.get('brief').content;
  var content = {
    targetGroup : (b.targetGroup) ? b.targetGroup : "{target group}",
    targetBehavior : (b.targetBehavior) ? b.targetBehavior : "{target behavior}",
    briefDisplayName : (b.briefDisplayName) ? b.briefDisplayName : Session.get('brief').name,
    brandName : (b.brandName) ? b.brandName : "{brand name}",
    brandDefinition : (b.brandDefinition) ? b.brandDefinition : "{brand definition}",
    productName : (b.productName) ? b.productName : "{product name}",
    productDefinition : (b.productDefinition) ? b.productDefinition : "{product definition}",
    currentSituation : (b.currentSituation) ? b.currentSituation : "{current situation}",
    businessGoal : (b.businessGoal) ? b.businessGoal : "{business goal}",
    businessObjectives : (b.businessObjectives) ? b.businessObjectives : ["{business objective 1}"],
    targetSex : (b.targetSex) ? b.targetSex : "{male or female}",
    targetMinAge : (b.targetMinAge) ? b.targetMinAge : "0",
    targetMaxAge : (b.targetMaxAge) ? b.targetMaxAge : "99",
    targetLifeConditions : (b.targetLifeConditions) ? b.targetLifeConditions : "{target life conditions}",
    targetCurrentLife : (b.targetCurrentLife) ? b.targetCurrentLife : "{current life}",
    targetChallenges : (b.targetChallenges) ? b.targetChallenges : ["{target challenges}"],
    targetDreams : (b.targetDreams) ? b.targetDreams : ["{target dream 1}"],
    currentAttitude : (b.currentAttitude) ? b.currentAttitude : "{current attitude}",
    currentBehavior : (b.currentBehavior) ? b.currentBehavior : "{current behavior}",
    targetAttitude : (b.targetAttitude) ? b.targetAttitude : "{target attitude}",
    targetBehaviorConditions : (b.targetBehaviorConditions) ? b.targetBehaviorConditions : ["{target behavior condition 1}"],
    KPIs : (b.KPIs) ? b.KPIs : ["{KPI1 changes from A to B}"],
    additionalInfo : (b.additionalInfo) ? b.additionalInfo : ["{additional point 1}"],
    mandatoryDeliverables : (b.mandatoryDeliverables) ? b.mandatoryDeliverables : ["{deliverable 1}"],
    timing : (b.timing) ? b.timing : ["{what - when}"]
  };
  return content;
});

Handlebars.registerHelper('myBriefs', function() {
  if(Meteor.user()) {
    return Briefs.find({},{sort: {lastEdited: -1}});
  }
});

Handlebars.registerHelper('isMyBrief', function() {
  if(!Meteor.user()) {
    return false;
  } else {
    return!($.inArray(Meteor.userId(), Session.get('brief').owners) == -1); //return true if current user is one of the owners
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
          Router.navigate("#/edit/"+result, false);
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

Template.singleBriefLi.b = function() {
  return this.content;
};

Template.singleBriefLi.events = {
  'click #deleteBrief' : function(e) {
    e.preventDefault();
    var yes = confirm("Are you sure? This can't be undone.");
    if(yes) {
      Meteor.call('deleteBrief', this._id, function(error, result) {notifyCallRes(error, result);});
    }
  },
};

Template.edit.rendered = function() {
  //console.log('rendered!');
  $('.editable').editable(function(value, settings){
    saveEditChanges(this.id, value);
    //console.log(value);
    //console.log(settings);
    return value;
  }, {//options
    style: 'inherit',
    event: 'click',
    onblur: 'submit',
    tooltip: 'click to edit...'
  });
  //areas
  $('.editable-area').editable(function(value, settings){
    saveEditChanges(this.id, value);
    //console.log(value);
    //console.log(settings);
    return value;
  }, {//options
    type: 'autogrow',
    event: 'click',
    onblur: 'submit',
    tooltip: 'click to edit...',
  }); 
  //lists
  $('.editable-list').editable(function(value, settings) {
    //console.log(value);
    if(value) {
      var expr = /\* /g;
      value = value.replace(expr, "");
      var d = value.split("\n");
    }
    if(d) {
      saveEditChanges(this.id, d);
      var dHtml = "<ul><li>";
      for (x=0; x<(d.length-1); x++) {
        dHtml += d[x]+"</li><li>";
      }
      dHtml += d[d.length-1]+"</li></ul>";
      return dHtml;
    } else {
      saveEditChanges(this.id, value);
      return value;
    }
  }, {
    type: 'autogrow',
    style: 'inherit',
    data: function(value, settings) {
      //console.log($(this).attr("id"));
      return markdownFromArray(Session.get('brief').content[$(this).attr("id")]);
    },
    event: 'click',
    onblur: 'submit',
    tooltip: 'click to edit...',
  });
}

Template.edit.events = {
  'click .accordion-toggle': function(e) {
    e.preventDefault();
    var which = e.target.id;
    Meteor.setTimeout(function() {
      Session.set('editStep', which.charAt(4));
      
    }, 400);
    history.replaceState(null, null, "#/edit/"+Session.get('brief')._id+"/"+which);
  },
  'click #finishEditing' : function() {
    Router.navigate("#/brief/"+Session.get('brief').name, false);
  }
};

//////////ROUTER///////////
var myRouter = Backbone.Router.extend({
  routes: {
    "brief/:name": "brief",
    "new": "createNew",
    "edit/:id/step:step" : "edit",
    "edit/:id" : "edit",
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
      history.replaceState(null, null, "#/edit/"+id+"/step1");
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

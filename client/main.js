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

function loadBrief(loadBy, name, id, pass, goWhere, briefView) {
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
              Session.set('view', 'brief');
              if(briefView) {
                Session.set('briefView', briefView);
              } else {
                Session.set('briefView', result.defaultView);
                history.replaceState(null, null, Meteor.absoluteUrl()+"#/brief/"+Session.get('brief').name+"/view/"+result.defaultView);
              }
            }
          }
        }
      }
    })}, 1000); //can we fix this to be better than a fixed number of milliseconds? otherwise error is shown first.
};

function saving(what) {
  if(what == 'saving')
    $("#saving").html("saving...");
  else
    $("#saving").html("all changes saved");
};

function saveEditChanges(key, value) { //key - fieldName, value - new value
  saving('saving');
  //console.log(key+':'+value);
  key = key.toString();
  //console.log(value);
  var b = Session.get('brief');
  //first we need to first update the local (Session.get('brief'))
  b.content[key] = value;
  Session.set('brief', b);  
  //second update on the server

  Meteor.call('updateBrief', b._id, key.toString(), value, function(error, result) {
    if(error)
      notify('error', error.reason);
      saving('saved');
    if(result) {
      saving('saved');
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
Handlebars.registerHelper('siteUrl', function() {
  return Meteor.absoluteUrl();
});

Handlebars.registerHelper('view', function(which) {
  return Session.get('view') == which;
});

Handlebars.registerHelper('briefView', function(which) {
  if(Session.get('briefView')) {
    return Session.get('briefView') == which;
  } else {
    return 'telescopic' == which;
  }
});

Handlebars.registerHelper('brief', function() {
  return Session.get('brief');
});

Handlebars.registerHelper('btext', function() { //constructing the sentences of the brief for viewing
  var btext = Session.get('brief').content;
  //keyChallenge
  btext.keyChallenge = (btext.targetGroup && !(btext.targetGroup == "") && btext.targetBehavior && !(btext.targetBehavior == "")) ? "We want "+btext.targetGroup+" to "+btext.targetBehavior+"." : "";
  //aboutBrand
  btext.aboutBrand = "";
  if(btext.brandName && !(btext.brandName == ""))
    btext.aboutBrand += "We are "+btext.brandName;
  if(btext.brandDefinition && btext.brandDefinition != "")
    btext.aboutBrand += ", "+btext.brandDefinition;
  if(btext.aboutBrand != "") {
    btext.aboutBrand +=".";
  } else {
    btext.aboutBrand = false;
  }
  //aboutProduct
  btext.aboutProduct = "";
  if(btext.productName && !(btext.productName == ""))
    btext.aboutProduct += btext.productName;
  if(btext.productDefinition && btext.productDefinition != "")
    btext.aboutProduct += " is "+btext.productDefinition;
  if(btext.aboutProduct != "")
    btext.aboutProduct +="."; 
  else
    btext.aboutProduct = false;
  //currentSituation
  if(!(btext.currentSituation && btext.currentSituation != ""))
    btext.currentSituation = false;
  //targetDefinition
  if(btext.targetGroup && btext.targetGroup != "")
    btext.targetDefinition = "Our key target group is "+btext.targetGroup+".";
  //aboutTarget
  btext.aboutTarget = "";
  if(btext.targetSex && btext.targetSex != "")
    btext.aboutTarget += "They are "+btext.targetSex;
  if(btext.targetMinAge && btext.targetMaxAge)
    btext.aboutTarget += " from "+btext.targetMinAge+" to "+btext.targetMaxAge+" years old";
  if(btext.targetLifeConditions && btext.targetLifeConditions != "")
    btext.aboutTarget += ", who live "+btext.targetLifeConditions;
  if(btext.aboutTarget !="")
    btext.aboutTarget += "."
  else
    btext.aboutTarget = false;
  //theyDoInstead
  if(btext.currentBehavior && btext.currentBehvaior != "") {
    btext.theyDoInstead = "Currently they "+btext.currentBehavior+" instead.";
  } else {
    btext.theyDoInstead = false;
  }
  //whyTheyDont
  if(btext.currentAttitude && btext.currentAttitude != "") {
    btext.whyTheyDont = "Currently they don\'t "+btext.targetBehavior+" because "+btext.currentAttitude+".";
  } else {
    btext.whyTheyDont = false;
  }  
  
  return btext;
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

Template.navbarUser.events = {
  'click #signOut' : function(e) {
    e.preventDefault();
    loading('show');
    Meteor.logout(function() {
      window.location.href=Meteor.absoluteUrl();
      loading('hide');
    });
  },
};

Template.navbarNonUser.events = {
  'click #signIn' : function(e) {
    e.preventDefault();
    loading('show');
    Meteor.loginWithFacebook(function() {
      loading('hide'); 
      Session.set('view', 'myApp'); //FIXX! here we need to redirect the user to where he was and add the brief he was viewing t/ editing o his briefs
    });
  },
};

Template.navbarBriefOptions.events = {
  'click .viewSwitch' : function(e) {
    e.preventDefault();
    var newView = e.target.id;
    //console.log(newView)
    if(!(newView == Session.get('briefView'))) {
      Session.set('briefView', newView);
      history.pushState(null, null, Meteor.absoluteUrl()+"#/brief/"+Session.get('brief').name+"/view/"+newView);
    }
  },
  'click #downloadPdf' : function(e) {
    e.preventDefault();
    alert('under construction...');
  },
};

Template.navbarEditOptions.defaultView = function(which) {
  return Session.get('brief').defaultView == which;
};

Template.navbarEditOptions.events = {
  'click #delete' : function(e) {
    e.preventDefault();
    var yes = confirm("Are you sure? This can't be undone.");
    if(yes) {
      Meteor.call('deleteBrief', Session.get('brief')._id, function(error, result) {notifyCallRes(error, result);
        if(result == 'brief successfully deleted')
          Router.navigate('#', true);
      });
    }
  },
  'click #addPass' : function(e) {
    e.preventDefault();
    var pass = prompt('New Password');
    if(!pass || pass=="") {
      notify('error', 'password can\'t be blank');
      return;
    }      
    if(pass) {
      Meteor.call('changeBriefPass', Session.get('brief')._id, pass, function(error, result) {notifyCallRes(error,result)
        if(result) {
          var b = Session.get('brief');
          b.password = pass;
          b.passwordProtected = true;
          Session.set('brief', b);
          Meteor.flush();
        }      
      });
    }
  },
  'click #deletePass' : function(e) {
    e.preventDefault();
    var yes = confirm('This brief will be publicly available without a password. Are you sure?');
    if (yes) {
      Meteor.call('changeBriefPass', Session.get('brief')._id, null, function(error, result) {notifyCallRes(error,result)
        if(result) {
          var b = Session.get('brief');
          b.password = undefined;
          b.passwordProtected = false;
          Session.set('brief', b);
          Meteor.flush();
        }      
      });     
    }
  },
  'click #changePass' : function(e) {
    e.preventDefault();
    var pass = (prompt('Password', Session.get('brief').password));
    if(pass) {
      Meteor.call('changeBriefPass', Session.get('brief')._id, pass, function(error, result) {notifyCallRes(error,result);
        if(result) {
          var b = Session.get('brief');
          b.password = pass;
          Session.set('brief', b);
        }
      });
    } else {
      notify('error', 'password can\'t be blank');
    }
  },
  'click .defaultViewSwitch' : function(e) {
    e.preventDefault();
    var newView = e.target.id;
    Meteor.call('changeDefaultView', Session.get('brief')._id, newView, function(error, result) {
      notifyCallRes(error,result);
      if(result) {
        var b = Session.get('brief');
        b.defaultView = newView;
        Session.set('brief', b);
      }
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
    Meteor.call('createNewBrief', $("#briefName").val(), $("#passwordProtect").is(':checked'), $("#briefPassword").val(), $("#userEmail").val(), Session.get('forkedFrom'), function(error,result) {    
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
      
    }, 300);
    history.replaceState(null, null, "#/edit/"+Session.get('brief')._id+"/"+which);
  },
  'click #finishEditing' : function() {
    Router.navigate("#/brief/"+Session.get('brief').name, false);
  },
  'click #techInstructionsBtn' : function(e) {
    e.preventDefault();
    Session.set('techInstructions', true);
    Meteor.flush();
    $("#instructionsModal").show();
  },
};
  
Template.nextButton.next = function() {
  return Number(Session.get('editStep'))+1;
};

Template.nextButton.events = {
  'click .nextBtn': function(e) {
    e.preventDefault();
    var which = e.target.id;
    Meteor.setTimeout(function() {
      Session.set('editStep', which.charAt(4));
      
    }, 300);
    history.replaceState(null, null, "#/edit/"+Session.get('brief')._id+"/"+which);
  },
};

Template.stepInstruction.step = function() {
  return Session.get('editStep');
};

Template.stepInstruction.techInstructions = function() {
  return Session.get('techInstructions');
};

Template.stepInstruction.events = {
  'click #instructionsBtn' : function(e) {
    e.preventDefault();
    $("#instructionsModal").show();
  },
  'click .closeBtn' : function(e) {
    e.preventDefault();
    $("#instructionsModal").hide();
    Session.set('techInstructions', false);
  },
};

Template.briefTelescopic.events = {
  'click #toggleCollaps' : function(e) {
    e.preventDefault();
    if($("#toggleCollaps").html() == "expand all") {
      $("#toggleCollaps").html("collapse all");
      $(".collapsTelescopic").show();
      $(".collapsControl").removeClass('collapsControl-active');
    } else {
      /*FIX! reload the whole thing??? otherwise second time it doesn't go correclty*/
      $("#toggleCollaps").html("expand all");
      $(".collapsTelescopic").hide();    
      $(".collapsControl").addClass('collapsControl-active');     
    }
  },
  'click .collapsControl' : function(e) {
    e.preventDefault();
    var idToShow = $(e.target).attr('collaps-toggle');
    var idToDeactivate = $(e.target).attr('collaps-deactivate');
    var reactivateToId = $(e.target).attr('collaps-reactivate-id');
    if(idToDeactivate) {
      $("#"+idToDeactivate).removeClass('collapsControl-active');
    }
    //console.log(idToShow);
    $("#"+idToShow).show();
    if(reactivateToId) {
      $(e.target).attr('collaps-toggle', reactivateToId);
      $(e.target).attr('collaps-reactivate-id', null);
    } else {
      $(e.target).removeClass('collapsControl-active');
    }
  },
};

//////////ROUTER///////////
var myRouter = Backbone.Router.extend({
  routes: {
    "brief/:name/view/:view*asdk" : "brief",
    "brief/:name*stuff": "brief",
    "new/from/:from" : "createNew",
    "new*stuff": "createNew",
    "edit/:id/step:step" : "edit",
    "edit/:id*stuff" : "edit",
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
  brief: function(name, view) {
    if(view) {
      view = view.toString();
      var validViews = ['telescopic', 'table', 'paragraph', 'presentation'];
      if($.inArray(view, validViews) == -1) {
        view = 'telescopic';
        history.replaceState(null, null, "#/brief/"+name+"/view/telescopic");
      }
    } else {
      history.replaceState(null, null, "#/brief/"+name+"/view/telescopic");
    }
    //console.log(view);
    Session.set('goWhere', 'brief');
    loadBrief("name", name, null, null, "brief", view);
  },
  pdf: function() {
    Session.set('view', 'pdf');
  },
  createNew: function(from) {
    if(from)
      Session.set('forkedFrom', from)
    else
      Session.set('forkedFrom', false);
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

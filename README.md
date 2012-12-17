#ABOUT

##data-structure:

###DB.briefs:
* _id: Meteor.uuid
* lastModified: timestamp
* owners: [] array of userIds
* readers: [] array of userId (for not putting in password again if you are signed in
* passwordProtected: true/false
* password: "string" //not secure for now
* name: "unique name"
* shortLink: "string" -> goo.gl shortlink (?) //LATER
* createdBy: "userName" || "user email"
* forkedFrom: _id of the brief we forked from (if any)
* defaultView: "telescopic" / "paragraph" / "table" / "present" ...
* content: {object with properties}

###Brief.content. :
* briefDisplayName
* brandName
* brandDefinition
* productName
* productDefinition
* currentSituation
* businessGoal
* businessObjectives: [] //array of objectives
* targetGroup
* targetSex
* targetMinAge
* targetMaxAge
* targetLifeConditions: [] //array of conditions
* targetCurrentLife
* targetChallenges: [] //array of challenges
* targetDreams: [] //array of dreams
* currentBehavior
* currentAttitude
* targetBehavior
* targetAttitude
* targetBehaviorConditions: [] //array of conditions that may lead to target behavior
* KPIs: [] //array of KPIs, for each .name, .current, .target
* additionalInfo: [] //array of strings with additional info
* timing: [] //array of key points in timing
* mandatoryDeliverables: [] //array of mandatory delivrables like TVC, OOH...

##TODO
* add timing and deliverables section to the .pdf brief
* usability of 'edit' -> next button between stages
* add info / instructions
* add first time instruction video? (shown only once)
* add navbar for all views
* generate .pdf (?how?) or other printable version
* for viewing (but not editing!) -> implement app breathing to make sure that synced?
* google analytics

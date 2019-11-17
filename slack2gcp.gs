
function keeperTime() {

  const ProjectName = PropertiesService.getScriptProperties().getProperty('PROJECT');

  var MyQueue = new CtrlSsQueue(ProjectName);
  var AlarmExist = MyQueue.get();

  if ( AlarmExist === 'IncidentExist' ) {
    sendStatus();
    MyQueue.remove();
  }
  
}

function sendStatus() {

  const Message = 'こんな感じやて';

  const ProjectName = PropertiesService.getScriptProperties().getProperty('PROJECT');
  const RegionsList = PropertiesService.getScriptProperties().getProperty('REGIONLIST');
  const ZonesList = PropertiesService.getScriptProperties().getProperty('ZONELIST');

  const ApiToken = ScriptApp.getOAuthToken();

  var myGcp = new ctrlGcp(ApiToken, ProjectName, RegionsList, ZonesList );

  const SlackPayload = {
      'text'       : Message,
      'attachments': [ 
        myGcp.getGaeVersions(),
        myGcp.getGceRegions(),
        myGcp.getGceZones(),
        myGcp.getGceInstances(),
      ]

  };

  postSlack(SlackPayload);

  
}



// POST Payload to Slack App.
function postSlack(SlackPayload){

  const SlackPostUrl = PropertiesService.getScriptProperties().getProperty('SLACK_URL');

  const SlackPostOptions = {
    'method' : 'POST',
    'contentType' : 'application/json; charset=UTF-8',
      'payload' : JSON.stringify(SlackPayload),
  };

  var res =  UrlFetchApp.fetch(SlackPostUrl, SlackPostOptions);
  Logger.log(res.getContentText());

}

// GET GCP API.
function BK_getGcpApi(ApiUrl, Options){

  const HttpResponse = UrlFetchApp.fetch(ApiUrl, Options);
  const Content = HttpResponse.getContentText("UTF-8");
  const ObjJson = JSON.parse(Content);

  return ObjJson;
  
}

// GET GCP API.
function getGcpApi(ApiUrl, Options){

  try {
    const HttpResponse = UrlFetchApp.fetch(ApiUrl, Options);
    const Content = HttpResponse.getContentText("UTF-8");
    const ObjJson = JSON.parse(Content);
  } catch(err) {
      console.log(err);
  }
    
  return ObjJson;
  
}


// GCP Access Control Class
var ctrlGcp = function ( ApiToken, ProjectName, ListRegions, ListZones ) {
  this.ApiToken    = ApiToken;
  this.ProjectName = ProjectName;
  this.ListRegions = ListRegions;
  this.ListZones   = ListZones;
}

ctrlGcp.prototype = {

  // get status of GCE instances.
  getGceInstances : function() {

    const GceApiUrl='https://www.googleapis.com/compute/v1/projects/';
    const Options = { 'headers': {'Authorization': 'Bearer ' + this.ApiToken}};

    var Responses = '';
    var DownCounts = 0;

    // Confirm status of instances.
    const AryTmp1 = this.ListZones.split(",");
    const ZoneCount = AryTmp1.length;

    for(var i = 0; i < ZoneCount; i++) {

      // Get status of GCE instances.
      var ObjJson = getGcpApi(GceApiUrl + this.ProjectName + '/zones/' + AryTmp1[i] + '/instances/', Options);

      var InstanceCount = ObjJson.items.length;
    
      for ( var j = 0; j < InstanceCount; j++ ) {
    
        if ( ObjJson.items[j].status != 'RUNNING' ) { DownCounts++; }

        if ( DownCounts == 0 ) { var AttachmentColor = 'good';}
        else { var AttachmentColor = 'danger'; }

        var Responses = Responses + ObjJson.items[j].name + ' : ' + ObjJson.items[j].status + '\n';
 
      }
    }

    const SlackAttachment = {
      'color': AttachmentColor,
      'title': ':computer: Instances@GCE',
      'text': Responses
    }

    return SlackAttachment;
  },
  
  // get status of GCE zones.
  getGceZones : function() {

    const GceApiUrl='https://www.googleapis.com/compute/v1/projects/';
    const Options = { 'headers': {'Authorization': 'Bearer ' + this.ApiToken}};

    var Responses = '';
    var DownCounts = 0;

    // Confirm status of zones.
    const AryTmp1 = this.ListZones.split(",");
    const ZoneCount = AryTmp1.length;
    
    for(var i = 0; i < ZoneCount; i++) {

      // Get status of GCE zones.
      var ObjJson = getGcpApi(GceApiUrl + this.ProjectName + '/zones/' + AryTmp1[i], Options);

      if ( ObjJson.status != 'UP' ) { DownCounts++; }

      if ( DownCounts == 0 ) { var AttachmentColor = 'good';}
      else { var AttachmentColor = 'danger'; }

      var Responses = Responses + ObjJson.name + ' : ' + ObjJson.status + '\n';

    }

    const SlackAttachment = {
      'color': AttachmentColor,
      'title': ':office: Zones@GCE',
      'text': Responses
    }

    return SlackAttachment;
  },

  // get status of GCE regions.
  getGceRegions : function() {

    const GceApiUrl='https://www.googleapis.com/compute/v1/projects/';
    const Options = { 'headers': {'Authorization': 'Bearer ' + this.ApiToken}};

    var Responses = '';
    var DownCounts = 0;

    // Confirm status of regions.
    const AryTmp1 = this.ListRegions.split(",");
    const RegionCount = AryTmp1.length;
    
    for(var i = 0; i < RegionCount; i++) {

      // Get status of GCE regions.
      var ObjJson = getGcpApi(GceApiUrl + this.ProjectName + '/regions/' + AryTmp1[i], Options);

      if ( ObjJson.status != 'UP' ) { DownCounts++; }

      if ( DownCounts == 0 ) { var AttachmentColor = 'good';}
      else { var AttachmentColor = 'danger'; }

      var Responses = Responses + ObjJson.name + ' : ' + ObjJson.status + '\n';

    }

    const SlackAttachment = {
      'color': AttachmentColor,
      'title': ':earth_americas: Regions@GCE',
      'text': Responses
    }

    return SlackAttachment;
  },
  
  // get status of GAE versions.
  getGaeVersions : function() {

    const GaeApiUrl='https://appengine.googleapis.com/v1/apps/';
    const Options = { 'headers': {'Authorization': 'Bearer ' + this.ApiToken}};

    var Responses = '';
    var DownCounts = 0;

    // Confirm status of zones.
    var ObjJson = getGcpApi(GaeApiUrl + this.ProjectName + '/services/default/versions/', Options);
    var Count = ObjJson.versions.length;
    
    for ( var i = 0; i < Count; i++ ) {

      if ( ObjJson.versions[i].servingStatus != 'SERVING' ) { DownCounts++; }

      if ( DownCounts == 0 ) { var AttachmentColor = 'good';}
      else { var AttachmentColor = 'danger'; }

      var Responses = Responses + ObjJson.versions[i].name + ' : ' + ObjJson.versions[i].servingStatus + '\n';

    }

    const SlackAttachment = {
      'color': AttachmentColor,
      'title': ':dolphin: Versions@GAE',
      'text': Responses
    }

    return SlackAttachment;
  }


}




// File Control Class
var CtrlFile = function ( FileName ) {
  this.FileName = FileName;
}

CtrlFile.prototype = {

  // get identifier of file on root directory.
  getSSID : function() {

    const RootId = DriveApp.getRootFolder().getId();
    const RootFolder = DriveApp.getFolderById(RootId);  
    const RootFiles = RootFolder.getFiles();

    while (RootFiles.hasNext()) {
      var FileName = RootFiles.next();
    
      if ( FileName.getName() === this.FileName ) {
        var SsId = FileName.getId();
        break;
      }
    }
    return SsId;
  }
}


// Control Spread Sheet Class
var CtrlSsQueue = function ( ProjectName ) {
  this.ProjectName = ProjectName;
}

CtrlSsQueue.prototype = {

  // put to the spreadsheet queue.
  put : function() {

    // Set Spread Sheet Name.
    const SsName = 'QUEUE';

    var MySs = new CtrlFile(SsName);
    var SsId = MySs.getSSID();

    // if not exist SS then create.
    if ( !SsId ) {
      SpreadsheetApp.create(SsName);
      var MySs = new CtrlFile(SsName);
      var SsId = MySs.getSSID();
    }

    // open spread sheet by id.
    const ObjSs = SpreadsheetApp.openById(SsId);

    // get sheet name.
    var SheetName = ObjSs.getSheetByName(this.ProjectName);

    // if not exist sheet then insert.
    if ( !SheetName ) {
      ObjSs.insertSheet(this.ProjectName);
      var SheetName = ObjSs.getSheetByName(this.ProjectName);
    }

    SheetName.getRange(1,1).setValue('IncidentExist');


  },
  
  // get from the spread sheet queue
  get : function(){

    // Set Spread Sheet Name.
    const SsName = 'QUEUE';

    var MySs = new CtrlFile(SsName);
    var SsId = MySs.getSSID();

    // open spread sheet by id.
    const ObjSs = SpreadsheetApp.openById(SsId);

    // get sheet name.
    var SheetName = ObjSs.getSheetByName(this.ProjectName);

    var Value = SheetName.getRange(1,1).getValue();

    return Value;

  },

  // remove from the spreadsheet queue.
  remove : function() {

    // Set Spread Sheet Name.
    const SsName = 'QUEUE';

    var MySs = new CtrlFile(SsName);
    var SsId = MySs.getSSID();

    // if not exist SS then create.
    if ( !SsId ) {
      SpreadsheetApp.create(SsName);
      var MySs = new CtrlFile(SsName);
      var SsId = MySs.getSSID();
    }

    // open spread sheet by id.
    const ObjSs = SpreadsheetApp.openById(SsId);

    // get sheet name.
    var SheetName = ObjSs.getSheetByName(this.ProjectName);

    // if not exist sheet then insert.
    if ( !SheetName ) {
      ObjSs.insertSheet(this.ProjectName);
      var SheetName = ObjSs.getSheetByName(this.ProjectName);
    }

    SheetName.getRange(1,1).setValue('IncidentNotExist');


  }


}







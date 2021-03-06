const { cli } = require('cli-ux');
const fs = require('fs');
const { getListOfFunctionsAndAssets } = require('@twilio-labs/serverless-api/dist/utils/fs');
const moment = require('moment');
const path = require('path');
const { TwilioServerlessApiClient } = require('@twilio-labs/serverless-api');
const TwilioApp = require('./twilioapp')

function getInstallInfo() {
  try {
    return JSON.parse(fs.readFileSync(".twilio-functions"))
  }
  catch(error) {
    return null
  }
}

function writeInstallInfo(appInfo) {
  fs.writeFileSync(".twilio-functions",JSON.stringify(appInfo))
}

// copy of getAppInfo()
async function getTwilioAppFromFunctionsFile(client) {
  const installInfo = getInstallInfo()
  if(!installInfo) {
    throw("No .twilio-functions file")
  }
  const services = await client.serverless.services(installInfo.serviceSid).fetch()
  if(services.length==0) {
    throw(`App with serviceSid ${installInfo.serviceSid} does not exist. Clean up .twilio-functions file`)
  }

  return new TwilioApp(client, {
    serviceSid: installInfo.serviceSid,
    serviceName: installInfo.serviceName,
    environmentSid: installInfo.environmentSid,
    domain: installInfo.domain
  })

}

async function getAppInfo() {
  const installInfo = getInstallInfo()
  if(!installInfo) {
    throw error("getAppInfo failed: No .twilio-functions file")
  }
  const services = await this.twilioClient.serverless.services(installInfo.serviceSid).fetch()
  if(services.length==0) {
    throw error(`getAppInfo failed: App with serviceSid ${installInfo.serviceSid} does not exist. Clean up .twilio-functions file`)
  }

  //const appInstance = await this.twilioClient.serverless.services(app.sid);
  //const [environment] = await appInstance.environments.list();
  //const variables = await appInstance.environments(environment.sid).variables.list();

  return {
    serviceSid: installInfo.serviceSid,
    serviceName: installInfo.serviceName,
    domain: installInfo.domain
  };
}

function appInfoFromDeployResult(deployResult) {
  let appInfo = {
    projects: {},
    serviceSid: deployResult.serviceSid,
    latestBuild: deployResult.buildSid,
    serviceName: deployResult.serviceName,
    environmentSid: deployResult.environmentSid,
    domain: deployResult.domain
  }
  appInfo.projects[this.twilioClient.accountSid] = {
    serviceSid: deployResult.serviceSid,
    latestBuild: deployResult.buildSid
  }
  return appInfo
}

function getServiceName() {
  try {
    const pkgjson = JSON.parse(fs.readFileSync("package.json"))
    if(!pkgjson.name || pkgjson.name.length==0) {
      throw error("name not found in package.json")
    }
    return pkgjson.name
  } catch(error) {
    throw error("package.json not found")
  }
}

async function getService(name) {
  try {
    const res = await twilioClient.serverless.services.find({uniqueName: name })
    if(res.length>0) {
      return res[0]
    } else {
      return null
    }
  } catch(error) {
    console.error(`Error getting service ${name}: ${error}`)
    return null
  }
}

async function deploy() {
  const serviceName = getServiceName()
  if(!serviceName) {
    console.error("Error: Could not find a package.json in current directory or name not set in package.json")
    return
  }

  let deployOptions = await getListOfFunctionsAndAssets(process.cwd(), 
    { functionsFolderNames: ["functions"], assetsFolderNames: ["assets"] }
  );

  const installInfo = getInstallInfo()

  const serverlessClient = new TwilioServerlessApiClient({
    accountSid: this.twilioClient.username,
    authToken: this.twilioClient.password,
  });

  cli.action.start('deploying app');

  deployOptions = {
    ...deployOptions,
    env: {
      SAMPLE_VAR: "samplevalue"
    },
    pkgJson: {},
    serviceName: serviceName,
    functionsEnv: "dev",
  };

  if(installInfo) {
    const service =  twilioClient.serverless.services.find({sid: installInfo.serviceSid })
    if(service.length == 0) {
      console.log(`Service ${installInfo.serviceSid} not found. Delete .twilio-functions manually`)
      return
    }
    console.log(`Deploying to exising service ${installInfo.serviceSid}`)
    deployOptions.serviceSid = installInfo.serviceSid
  }


  try {
    const deployResult = await serverlessClient.deployProject(deployOptions);
    cli.action.stop("done");
    return deployResult
  } catch (e) {
    console.error('Something went wrong', e);
  }
}

module.exports = {
  deploy,
  getAppInfo,
  getTwilioAppFromFunctionsFile,
  getInstallInfo,
  appInfoFromDeployResult,
  writeInstallInfo,
  getServiceName
};

const ee = require('@google/earthengine');
const fs = require('fs');
const path = require('path');

const privateKey = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ee-hawkegeo-e9790f81bfd7.json'))
);

exports.handler = async function(event, context) {
  try {
    const credentials = new ee.ServiceAccountCredentials(
      privateKey.client_email,
      privateKey
    );

    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(privateKey, () => {
        ee.initialize(null, null, resolve, reject);
      }, reject);
    });

    const iran = ee.FeatureCollection("FAO/GAUL/2015/level2")
      .filter(ee.Filter.eq("ADM0_NAME", "Iran  (Islamic Republic of)"));

    const count = await iran.size().getInfo();

    return {
      statusCode: 200,
      body: JSON.stringify({ provincesCount: count })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

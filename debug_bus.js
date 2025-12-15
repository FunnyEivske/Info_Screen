
const https = require('https');

async function run() {
    const ids = ['NSR:StopPlace:21924', 'NSR:StopPlace:21930'];
    console.log(`\n--- Inspecting StopPlaces: ${ids.join(', ')} ---`);

    const postData = JSON.stringify({
        query: `
        {
          stopPlaces(ids: [${ids.map(id => `"${id}"`).join(',')}]) {
            id
            name
            transportMode
            quays {
              id
              publicCode
              name
              description
              estimatedCalls(numberOfDepartures: 5) {
                expectedArrivalTime
                destinationDisplay { frontText }
                serviceJourney { line { publicCode } }
              }
            }
          }
        }
        `
    });

    const options = {
        hostname: 'api.entur.io',
        path: '/journey-planner/v3/graphql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ET-Client-Name': 'debug-script'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log("\n--- GraphQL Result ---");
            const parsed = JSON.parse(data);
            if (parsed.data && parsed.data.stopPlaces) {
                parsed.data.stopPlaces.forEach(sp => {
                    if (!sp) return;
                    console.log(`\nID: ${sp.id}, Name: ${sp.name}`);
                    sp.quays.forEach(q => {
                        console.log(`  Quay: ${q.id} (${q.publicCode}) - ${q.name || ''} ${q.description || ''}`);
                        if (q.estimatedCalls.length > 0) {
                            console.log(`    First Bus: ${q.estimatedCalls[0].serviceJourney.line.publicCode} -> ${q.estimatedCalls[0].destinationDisplay.frontText}`);
                        } else {
                            console.log(`    No departures.`);
                        }
                    });
                });
            } else {
                console.log(JSON.stringify(parsed, null, 2));
            }
        });
    });

    req.write(postData);
    req.end();
}

run();

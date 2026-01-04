
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import express from 'express';
import dayjs from 'dayjs';

const VERCHECK = /^[0-9]+\./;

const app = express();
const octokit = new Octokit();

let latestVer: RestEndpointMethodTypes['repos']['listReleases']['response']['data'] | null = null;
let lastChecked: string | 0 = 0;

/**
 * I still hate typescript.
 */
function notStupidParseInt(v: string | undefined): number {
    return v === undefined ? NaN : parseInt(v);
}

async function getLatestVer() {
    let now = dayjs();
    if (!latestVer?.length || dayjs(lastChecked).isBefore(now.subtract(notStupidParseInt(process.env['TTL']) || 60, 'minutes'))) {
        const resp = await octokit.rest.repos.listReleases({
            owner: 'CorySanin',
            repo: 'Cemu'
        });
        if (resp && resp.status === 200 && resp.data && resp.data.length) {
            latestVer = resp.data;
            console.log(`Latest: ${latestVer?.[0]?.tag_name}`);
        }
        else {
            console.error(`Failed to get latest release: ${resp}`);
        }
        lastChecked = now.toJSON();
    }

    return latestVer?.[0];
}

app.get('/', (_, res) => {
    res.redirect('https://github.com/CorySanin/Cemu');
});

app.get('/releases', (_, res) => {
    res.redirect('https://github.com/CorySanin/Cemu/releases');
});

if (typeof process.env['DISCORD'] === 'string') {
    app.get('/discord', (_, res) => {
        res.redirect(process.env['DISCORD'] || '/'); // unreachable code courtesy of Microsoft Typescript
    });
}

app.get('/api2/version.php', async (req, res) => {
    const ver = req.query?.['v'];
    if (!ver || typeof ver !== 'string' || !('platform' in req.query) || !VERCHECK.test(ver)) {
        return res.send('');
    }
    const v = ver.split('-')[0];
    console.log(`${req.query['v']}/${req.query['platform']} checking for updates`);
    const latest = (await getLatestVer());
    if (!latest || `v${v}` === latest?.tag_name) {
        return res.send('');
    }
    const MATCHER = req.query['platform'] === 'windows' ? 'windows-x64.zip' : '.AppImage';
    const DL = latest?.assets?.reduce((accumulator: null | string, currentValue) => {
        return currentValue.name.includes(MATCHER) ? currentValue.browser_download_url : accumulator
    }, null);
    if (typeof DL !== 'string') {
        return res.send('');
    }
    return res.set('Cache-Control', 'public, max-age=900').send(`UPDATE|${encodeURIComponent(DL)}|${encodeURIComponent(latest.url)}`);
});

app.get('/healthcheck', (_, res) => {
    res.send('Healthy');
});

(function (port: number) {
    process.on('SIGTERM', app.listen(port, () => {
        console.log(`Xapfish update API listening on port ${port}`);
    }).close);
})(notStupidParseInt(process.env['PORT']) || 8080);

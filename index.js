(async function () {
    const { Octokit } = await import("octokit");
    const express = require('express');
    const dayjs = require('dayjs');

    const VERCHECK = /^[0-9]+\./;

    const app = express();
    const octokit = new Octokit();
    const port = process.env.PORT || 8080;

    let latestVer = null;
    let lastChecked = 0;

    async function getLatestVer() {
        let now = dayjs();
        if (!latestVer || dayjs(lastChecked).isBefore(now.subtract(process.env.TTL || 60, 'minutes'))) {
            const resp = await octokit.rest.repos.listReleases({
                owner: 'CorySanin',
                repo: 'Cemu'
            });
            if (resp && resp.status === 200 && resp.data && resp.data.length) {
                latestVer = resp.data[0];
                console.log(`Latest: ${latestVer.tag_name}`);
            }
            else {
                console.error(`Failed to get latest release: ${resp}`);
            }
            lastChecked = now.toJSON();
        }

        return latestVer;
    }

    app.get('/', (_, res) => {
        res.redirect('https://github.com/CorySanin/Cemu');
    });

    app.get('/releases', (_, res) => {
        res.redirect('https://github.com/CorySanin/Cemu/releases');
    });

    app.get('/api2/version.php', async (req, res) => {
        if ('v' in req.query && 'platform' in req.query && VERCHECK.test(req.query.v)) {
            const v = req.query.v.split('-')[0];
            console.log(`${req.query.v}/${req.query.platform} checking for updates`);
            const latest = await getLatestVer();
            if (`v${v}` !== latest.tag_name) {
                const MATCHER = req.query.platform === 'windows' ? 'windows-x64.zip' : '.AppImage';
                const DL = latest.assets.reduce((accumulator, currentValue) => {
                    return currentValue.name.includes(MATCHER) ? currentValue.browser_download_url : accumulator
                }, null);

                return res.set('Cache-Control', 'public, max-age=900').send(`UPDATE|${encodeURIComponent(DL)}|${encodeURIComponent(latest.url)}`);
            }
        }
        res.send('');
    });

    app.get('/healthcheck', (_, res) => {
        res.send('Healthy');
    });

    process.on('SIGTERM', app.listen(port, () => {
        console.log(`Xapfish update API listening on port ${port}`);
    }).close);
})();

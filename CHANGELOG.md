# Changelog

## [0.2.0](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/compare/v0.1.0...v0.2.0) (2026-08-18)


### Features

* add booking calendar app with spec, frontend, backend and e2e ([ee5221d](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/ee5221dcc8406eda3d05858836b96d4317c02f61))
* **admin:** add event type creation form ([a409289](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/a409289ad7ee832c225cca1379817df80d925bf9))
* **admin:** add event types tab with creation modal ([99a33d1](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/99a33d148367f31a051f789b5c5231b9a979974c))
* **admin:** add upcoming bookings list grouped by day ([a15d1b7](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/a15d1b7bc53197615775a3942220ecf4572d9776))
* **admin:** wire admin page tabs and document mock behaviour ([0488c62](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/0488c621fb7e0157c61d61504e8f4f97ebcbe4af))
* **api:** add admin endpoints and test helpers ([7d79f37](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/7d79f374a0639dbe0c5c9059417c409869856228))
* **backend:** add contract models with camelCase aliases and UTC formatting ([ae1ae92](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/ae1ae92c4881f7a6adefead17763c0ff6a858878))
* **backend:** create bookings and enforce the busy-time rule ([1a30270](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/1a30270a9ba5d02ab3a94ebc3827db97ac7e6706))
* **backend:** generate the slot grid and the 14-day booking window ([4befcd5](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/4befcd5d1b16b35f2359c9c5eb0c714ecae5e32c))
* **backend:** let the owner create event types ([9a3247a](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/9a3247aa3601ce0387a04c423b6a3809454ea2ef))
* **backend:** list upcoming bookings for the owner ([2ea02f7](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/2ea02f7f7f88eb3a05a58615f72bca78fc413460))
* **backend:** scaffold FastAPI app with CORS for the Vite dev origin ([88a5351](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/88a53519edb6dcb510a977e9e7323a0e18856e90))
* **backend:** serve event types and slots from in-memory storage ([249ab52](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/249ab52137cdaed747c268c504f980408e038586))
* **backend:** serve the built spa from the api process ([6a4020f](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/6a4020f3fe4c936b766aed17c9d40140a4c9d77e))
* **backend:** subtract bookings and lead time from slot availability ([cb1f36e](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/cb1f36e29b4f13a2a24039517ab717b9a048b4eb))
* **format:** add local day key and long date formatting ([f0cc7cd](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/f0cc7cd7420b3c0d47a572514a53db5cb868c023))
* **frontend:** add booking endpoints and shared resource hook ([d417018](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/d41701891e83d087eae6a85c484ef0795dbd1deb))
* **frontend:** add date and plural formatting helpers ([acbf2cc](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/acbf2cce109f1dcdb3bac615a92df913b6587453))
* **frontend:** add day and slot pickers to booking page ([99a98ed](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/99a98ed6d3d3bbc61a5cc84dd224688359f0c2a4))
* **frontend:** add event type picker page at /booking ([311e194](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/311e1943870a086331b5c625a4189b4007f5a25a))
* **frontend:** add typed API client and event types hook ([dca077e](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/dca077e93fd7b56bf5c54952eb514af6e334dccb))
* **frontend:** build home hero, slot preview and features sections ([a2c1883](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/a2c18839720db7bd41c8733724b6c3a3df74fc3b))
* **frontend:** render event types from mock API with loading and error states ([dc32b56](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/dc32b5614e6c016ee7bbb368d97c8a30009fabca))
* **frontend:** scaffold app shell with header and routing ([def3afc](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/def3afc3b995e9b5a1cab512c613ce2052f260a7))
* **frontend:** submit bookings with guest form and confirmation ([ce8bd66](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/ce8bd66f4906698adaabfdf1ead0789abfa04e3e))
* **lighthouse:** audit the deployed app nightly and report to an issue ([da6b161](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/da6b161a9540b0834d0af40a991cd33fb1b4341d))
* **openapi:** document contract-shaped error responses ([0fc7028](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/0fc70288cdd63af406652e7ff0330ec50f19c411))


### Bug Fixes

* **admin:** capitalize day headings, cover day-merge and id dedup, fix comma ([fd436d2](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/fd436d22d5b4ae473c721c2aa26db6c4ebe0edb4))
* **backend:** restrict UtcDateTime serializer to JSON mode only ([9701246](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/970124660a29f7dc8e09293c1f4deeed76726520))
* **cors:** allow Prefer header through CORS preflight ([d2ff54a](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/d2ff54a495ae301e7efd453a93dcba41dbd4abd7))
* **lighthouse:** list failed audits and harden the nightly agent prompt ([89b8193](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/89b8193b32098e751a4678b1ed962f7b2c685adb))
* **lighthouse:** quota failed audits per category and scope the repeat rule to red ([f6b44a1](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/f6b44a1698eac7ad85b2e704a87d6f9e576fd22b))
* **lighthouse:** report per-page run counts when they diverge ([e3c13cf](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/e3c13cfcf50930f2a083194927424e2da417df90))
* **lighthouse:** stop hardcoding the median line and scope gh issue perms ([49ea412](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/49ea4124fb0223440d39c4ed143c16008313cec0))
* **lighthouse:** tie the CONTRIBUTING repeat-rule note to red and fix a stale label ([9c982a3](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/9c982a3c49e8485190a55b82cfc0186ab1f7f92c))
* **lighthouse:** tolerate a single failed lighthouse run in the loop ([0b81a4b](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/0b81a4bc63fd208c0421fc1cadef99302bcae1d2))
* **storage:** snapshot bookings before iterating busy_intervals ([c4fa251](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/c4fa2515c0e191f634362185cbbeb9c6dfabc96e))


### Refactoring

* **e2e:** harden slot selection, conflict assertions and config ([892e491](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/892e49106d508ad252c24321a781da023057ad20))
* **errors:** dedupe the "event type not found" message ([ac1c029](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/ac1c0298e6c30521a267888e27dc035d7c5585f9))
* **storage:** move upcoming-bookings filter/sort into Storage ([b5e74e2](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/b5e74e21267fbe9cff89f4d858cc953787690bdc))


### Tests

* **e2e:** cover losing the slot while filling the guest form ([908d069](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/908d06987ecabd4a1bc53138f5b210e62d8c7a62))
* **e2e:** cover the duplicate event type id conflict ([4e86a04](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/4e86a042cc9e13b090b0f3554bb64f26ec0c2eb4))
* **e2e:** cover the full path from event type creation to booking ([619efba](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/619efba5ebf54fd559f9559173a20dee94ba0347))
* **e2e:** set up Playwright and cover the missing event type page ([8e5fcdf](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/8e5fcdf138e9c7476a4ce7082fc25bbd0cb116f1))
* **slots:** cover lead-time boundary and duration bounds ([f53ae61](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/f53ae613832bf158ec16018bf639d0a660a2e5f0))


### Documentation

* add design spec for booking page ([652fa45](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/652fa4527d9aa3809511724be2f063d8b5258ff7))
* add implementation plan for booking page ([c4f4bb0](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/c4f4bb079991290214cf5197657c2e0b5556d794))
* **admin:** add admin page implementation plan ([aa4f44a](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/aa4f44ac6777c4116c9967fd84400e3c1d8ae99d))
* **admin:** design admin page with event types and upcoming bookings ([da0f272](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/da0f27260f2f11455b229327a8204c3ba7d3629a))
* agree on the commit format and the release flow ([7ac2592](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/7ac25924a047a02ce0997c34928146524fac7153))
* **backend:** document how to run the service and its booking rules ([57d8eb3](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/57d8eb3055efbd8de83d7dbe363ea9b496009466))
* **claude:** describe skipped runs of the claude workflow precisely ([6f6c612](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/6f6c6126af698d91854c8ec2dec9dff9e64f4b5f))
* clean up merge conflict markers in readme ([1f3b279](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/1f3b27912472805d4f1b18b11effa295435cc056))
* describe how to build and run the docker image ([55f4cf1](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/55f4cf1e87d1099b15964095c23cddd8ba8aa0f7))
* describe how to reproduce a CI-only failure locally ([6775c65](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/6775c65e6d7673e88ae4eec623245dd1e14a2911))
* design the FastAPI backend with in-memory storage ([410c47b](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/410c47bcd22943f20e80eed36246ae000a4f3bde))
* **docker:** design a single image that serves the api and the spa ([aa55118](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/aa551189ed28ed786b829b816812ea8d6a42e28e))
* **docker:** plan the docker image implementation ([fba33f4](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/fba33f40675907a1fe36e08b29ee01f9e3946fce))
* **e2e:** design the Playwright end-to-end suite ([8f05b98](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/8f05b985e993744cd14e57d765806c36e65d4488))
* **e2e:** fix the reuse claims and document the setup traps ([e4a7f67](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/e4a7f67f3a455bddacfebc2b5d6dec08b7a480e5))
* **e2e:** plan the Playwright end-to-end suite ([e2bac4c](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/e2bac4cd99600428cfbf559f82c972cb7c000862))
* **e2e:** shorten design-doc link to fit the 100-char line limit ([b23733d](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/b23733de22afb5f93b4035d0467dc2516e19500a))
* **frontend:** document booking flow and mock quirks ([a3d1a08](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/a3d1a088cdbcb47f9e24a6dcec706c14f0772a12))
* **frontend:** document setup and run order ([270a95a](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/270a95ab9e2db199aec409cb68862c06956c8746))
* **lighthouse:** correct nightly lighthouse section after review ([8993967](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/8993967df678d9d600bcd0967b118c1e63cf4cff))
* **lighthouse:** describe the nightly lighthouse run ([cff995f](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/cff995fe79ad43534f0529066f5bd2ae613c1972))
* **lighthouse:** design nightly lighthouse audit workflow ([1019148](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/1019148269d57b223c08e1ac6bbe7ee975b7ee5b))
* **lighthouse:** plan the nightly lighthouse implementation ([10135ba](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/10135bae9583cf714a3de27a0d759e2e60241845))
* link the app published on railway ([5e10bf0](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/5e10bf062868efbf7fd721694ddf1df4a73e23b8))
* plan the FastAPI backend implementation ([9cd587f](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/9cd587f14aa9df42952caa28f599ed399b293392))
* **readme:** correct claim that Prefer header is rejected ([a70a5e0](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/a70a5e0a3f7bba66cf31de1b1cb25daba3cdf532))
* warn about lock files written by an outdated npm ([e04fb2c](https://github.com/Mikhail-Hursky/ai-for-developers-project-387/commit/e04fb2cb2684a6ace962648a4ea9dc2552dbc153))

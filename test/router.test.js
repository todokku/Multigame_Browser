import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../src/server/server';
import Errors from '../src/server/Models/Errors';

process.env.NODE_ENV = 'test';

const should = chai.should();
chai.use(chaiHttp);

// All requests made have some very common functionality, reducec the repetition.
function commonRequest({
  url, query, onSuccess, rejectErrors, done
}) {
  chai
    .request(app)
    .get(url)
    .query(query)
    .end((err, res) => {
      // Automatically fail a test that has an error, if the "rejectErrors" flag is set to true, and the "done" function is passed
      if (rejectErrors && done && (err || res.error)) {
        done(err || res.error);
      }
      onSuccess(err, res);
    });
}

describe('Router', function () {
  // Define what a "slow" execution is. Because these tests all have to hit Twitch's API, they're expected to be slower than others
  this.slow(400);

  it('Gets a response from the server', (done) => {
    commonRequest({
      url: '/',
      onSuccess: (err, res) => {
        if (err) {
          done(err);
        }
        res.should.have.status(404);
        done();
      }
    });
  });

  describe('Games', () => {
    describe('/games/top', () => {
      const url = '/api/games/top';
      it('Gets top 20 games by default', (done) => {
        commonRequest({
          url,
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf.within(19, 20);
            done();
          }
        });
      });

      const first = 4;
      it(`Gets the specified ${first} top games`, (done) => {
        commonRequest({
          url,
          query: { first },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf(first);
            done();
          }
        });
      });
    });

    describe('/games/specific', () => {
      const url = '/api/games/specific';
      it('Returns nothing with no games specified', (done) => {
        commonRequest({
          url,
          onSuccess: (err, res) => {
            if (err) {
              done(err);
            }

            expect(res.body)
              .to.be.an('array')
              .with.lengthOf(0);
            done();
          }
        });
      });

      it('Accepts a game by name', (done) => {
        commonRequest({
          url,
          query: { name: 'rimworld' },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.should.have.status(200);
            expect(res.body)
              .to.be.an('array')
              .with.lengthOf(1);
            expect(res.body[0]).to.have.property('id', 394568);

            done();
          }
        });
      });
      it('Accepts a game by ID', (done) => {
        commonRequest({
          url,
          query: { id: 394568 },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.should.have.status(200);
            expect(res.body)
              .to.be.an('array')
              .with.lengthOf(1);
            expect(res.body[0]).to.have.property('name', 'RimWorld');

            done();
          }
        });
      });
      it('Accepts multiple games', (done) => {
        const gameNames = [
          'Dead Cells', // Spaces in name
          "Tom Clancy's Rainbow Six: Siege", // Apostrophe and Colon in name
          'Dungeons & Dragons', // Ampersand in name
          'Tidalis' // A game that is almost guaranteed to have no viewers (sorry, Arcen Games)
        ];
        commonRequest({
          url,
          query: { name: gameNames },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.should.have.status(200);
            expect(res.body)
              .to.be.an('array')
              .with.lengthOf(gameNames.length);

            done();
          }
        });
      });
      it('Does not return partial matches', (done) => {
        commonRequest({
          url,
          query: { name: 'World of Wo' },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            expect(res.body)
              .to.be.an('array')
              .with.lengthOf(0);
            done();
          }
        });
      });
    });
  });

  describe('Streams', () => {
    describe('/streams/top', () => {
      const url = '/api/streams/top';
      it('Gets the top overall streams', (done) => {
        commonRequest({
          url,
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf(20);
            done();
          }
        });
      });
      it("Accepts 'first' to reduce the number of streams", (done) => {
        const first = 7;
        commonRequest({
          url,
          query: { first },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf(first);
            done();
          }
        });
      });
    });
    describe('/streams/games', () => {
      const url = '/api/streams/games';
      const alwaysOn = 499973;
      const creative = 488191;
      it('Returns nothing with no games specified', (done) => {
        commonRequest({
          url,
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf(0);

            done();
          }
        });
      });
      it('Gets streamers by game ID', (done) => {
        commonRequest({
          url,
          query: { game_id: alwaysOn }, // Always On
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf.above(0);
            done();
          }
        });
      });
      it('Accepts multiple games (awkward test)', (done) => {
        const gameIDs = [creative, alwaysOn];
        commonRequest({
          url,
          query: { game_id: gameIDs },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            let gotCreative = false;
            let gotAlwaysOn = false;

            res.body.forEach((stream) => {
              if (stream.game_id === gameIDs[0]) {
                gotCreative = true;
              } else if (stream.game_id === gameIDs[1]) {
                gotAlwaysOn = true;
              }
            });

            expect(gotCreative).to.be.true;
            expect(gotAlwaysOn).to.be.true;
            done();
          }
        });
      });
      it("Allows 'first' to reduce the number of streams", (done) => {
        const first = 2;
        commonRequest({
          url,
          query: { game_id: alwaysOn, first },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            res.body.should.be.an('array').and.have.lengthOf(first);
            done();
          }
        });
      });

      it("Allows 'language' to filter out certain languages", (done) => {
        // This is an awkward test. Making two calls, one nested, and testing that they have different results.
        commonRequest({
          url,
          query: { game_id: alwaysOn },
          rejectErrors: true,
          done,
          onSuccess: (err, res) => {
            const results = res.body;

            commonRequest({
              url,
              query: { game_id: alwaysOn, language: 'es' },
              rejectErrors: true,
              done,
              onSuccess: (err2, res2) => {
                expect(results).to.not.deep.equal(res2.body);
                done();
              }
            });
          }
        });
      });
    });

    describe('/streams/details', () => {});
  });
});

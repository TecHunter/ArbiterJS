define(['pubsub'], function (ps) {
    'use strict';
    var sub1Received,
        sub2Received,
        sub3Received,
        sub1This,
        sub2This,
        sub3This;
    describe('subscriptions', function () {

        it('should create one subscription', function () {
            ps.subscribe('/level1/level2', function (data) {
                sub1This = this;
                sub1Received = data;
            });
            expect(ps.subscriptions).not.toBeUndefined();
            expect(ps.subscriptions.level1).not.toBeUndefined();
            expect(ps.subscriptions.level1.level2).not.toBeUndefined();
            expect(ps.subscriptions.level1.level2._).not.toBeUndefined();
            expect(ps.subscriptions.level1.level2._.length).toEqual(1);
        });
        it('should create one wildcard subscription', function () {
            ps.subscribe('/level1/*', function (data) {
                sub2This = this;
                sub2Received = data;
            });
            expect(ps.subscriptions).not.toBeUndefined();
            expect(ps.subscriptions.level1).not.toBeUndefined();
            expect(ps.subscriptions.level1.level2).not.toBeUndefined();
            expect(ps.subscriptions.level1.level2._).not.toBeUndefined();
            expect(ps.subscriptions.level1['*']).not.toBeUndefined();
            expect(ps.subscriptions.level1['*']._).not.toBeUndefined();
            expect(ps.subscriptions.level1['*']._.length).toEqual(1);
            expect(ps.subscriptions.level1['*']._[0].channel).toEqual('/level1/*');
        });
        it('should create one wildcard subscription at root', function () {
            ps.subscribe('/*/level2', function (data) {
                sub3This = this;
                sub3Received = data;
            });
            expect(ps.subscriptions).not.toBeUndefined();
            expect(ps.subscriptions['*'].level2).not.toBeUndefined();
            expect(ps.subscriptions['*'].level2._).not.toBeUndefined();
            expect(ps.subscriptions['*'].level2._.length).toEqual(1);
            expect(ps.subscriptions['*'].level2._[0].channel).toEqual('/*/level2');
        });
    });

    describe('publish', function () {

        beforeEach(function () {
            sub1Received = undefined;
            sub2Received = undefined;
            sub3Received = undefined;
            sub1This = undefined;
            sub2This = undefined;
            sub3This = undefined;
        });

        it('should publish twice', function () {
            var data = new Date().getTime();

            ps.publish('/level1/level2', data);
            expect(sub1Received).toEqual(data);
            expect(sub2Received).toEqual(data);
            expect(sub3Received).toEqual(data);

            expect(sub1This).not.toBeUndefined();
            expect(sub2This).not.toBeUndefined();
            expect(sub1This.channel).toEqual('/level1/level2');
            expect(sub2This.channel).toContain('/level1/*');
            expect(sub3This.channel).toContain('/*/level2');

        });
        it('should create one wildcard subscription', function () {
            var data = new Date().getTime();

            ps.publish('/*/level2', data);
            expect(sub1Received).toEqual(data);
            expect(sub2Received).toEqual(data);
            expect(sub3Received).toEqual(data);

            expect(sub1This).not.toBeUndefined();
            expect(sub2This).not.toBeUndefined();
            expect(sub3This).not.toBeUndefined();
        });
        it('should create one wildcard subscription at root', function () {
            var data = new Date().getTime();

            ps.publish('/notAnExistingChanngel/level2', data);
            expect(sub1Received).toBeUndefined();
            expect(sub2Received).toBeUndefined();
            expect(sub3Received).toEqual(data);

            expect(sub1This).toBeUndefined();
            expect(sub2This).toBeUndefined();
            expect(sub3This).not.toBeUndefined();
            expect(sub3This.channel).toEqual('/*/level2');
        });
    });

});
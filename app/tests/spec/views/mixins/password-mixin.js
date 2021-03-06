/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function (require, exports, module) {
  'use strict';

  var $ = require('jquery');
  var BaseView = require('views/base');
  var chai = require('chai');
  var Cocktail = require('cocktail');
  var ExperimentMixin = require('views/mixins/experiment-mixin');
  var Metrics = require('lib/metrics');
  var Notifier = require('lib/channels/notifier');
  var PasswordMixin = require('views/mixins/password-mixin');
  var Relier = require('models/reliers/relier');
  var sinon = require('sinon');
  var TestHelpers = require('../../../lib/helpers');
  var TestTemplate = require('stache!templates/test_template');

  var assert = chai.assert;

  var PasswordView = BaseView.extend({
    template: TestTemplate
  });
  Cocktail.mixin(
    PasswordView,
    PasswordMixin,
    ExperimentMixin
  );

  describe('views/mixins/password-mixin', function () {
    var view;
    var relier;
    var metrics;

    beforeEach(function () {
      relier = new Relier();
      metrics = new Metrics();

      view = new PasswordView({
        metrics: metrics,
        notifier: new Notifier(),
        relier: relier,
        viewName: 'password-view'
      });

      return view.render()
        .then(function () {
          $('#container').html(view.el);
        });
    });

    afterEach(function () {
      $('#container').empty();
    });

    describe('afterVisible', function () {
      it('notifier not called by default', function () {
        sinon.spy(view.notifier, 'trigger');
        view.afterVisible();
        assert.isFalse(view.notifier.trigger.called);
      });

      it('notifier called if part of an experiment', function () {
        sinon.spy(view.notifier, 'trigger');
        sinon.stub(view, 'isInExperiment', function () {
          return true;
        });
        view.afterVisible();
        assert.isTrue(view.notifier.trigger.called);
      });

      it('hides show password button if part of an experiment', function () {
        sinon.stub(view, 'isInExperiment', function () {
          return true;
        });

        sinon.stub(view, 'isInExperimentGroup', function () {
          return true;
        });
        view.afterVisible();
        assert.isTrue(view.$('.show-password-label').is(':hidden'));
      });

      it('shows show password button if part of an experiment control', function () {
        sinon.stub(view, 'isInExperiment', function () {
          return true;
        });

        sinon.stub(view, 'isInExperimentGroup', function () {
          return false;
        });
        view.afterVisible();
        assert.isFalse(view.$('.show-password-label').is(':hidden'));
      });

    });

    describe('onPasswordVisibilityChange', function () {
      it('tracks the experiment click ', function () {
        sinon.stub(view, 'isInExperiment', function () {
          return true;
        });

        sinon.stub(view, 'isInExperimentGroup', function () {
          return true;
        });
        sinon.spy(view.notifier, 'trigger');

        view.afterVisible();
        view.$('.show-password').trigger('change');
        assert.isTrue(view.notifier.trigger.calledWith('showPassword.clicked'));
      });
    });

    describe('setPasswordVisibilityFromButton', function () {
      it('sets the password field to type=text if button is checked', function () {
        view.$('#show-password').attr('checked', 'checked');
        view.setPasswordVisibilityFromButton('#show-password');
        assert.equal(view.$('#password').attr('type'), 'text');
        assert.equal(view.$('#password').attr('autocapitalize'), 'off');
        assert.equal(view.$('#password').attr('autocorrect'), 'off');
      });

      it('sets the password field to type=password if button is unchecked', function () {
        view.$('#show-password').removeAttr('checked');
        view.setPasswordVisibilityFromButton('#show-password');
        assert.equal(view.$('#password').attr('type'), 'password');
        assert.isUndefined(view.$('#password').attr('autocapitalize'));
        assert.isUndefined(view.$('#password').attr('autocorrect'));
      });
    });

    describe('clicking on unsynched/synched show buttons', function () {
      it('gets pwd inputs to be shown', function () {
        var targets = view.getAffectedPasswordInputs('#show-password');
        assert.equal(targets.length, 1);

        view.$('#show-password').data('synchronize-show', 'true');
        targets = view.getAffectedPasswordInputs('#show-password');
        assert.equal(targets.length, 2);
      });
    });

    describe('clicking on the show button', function () {
      it('pw field set to text when clicked', function () {
        view.$('.show-password').click();
        assert.equal(view.$('#password').attr('type'), 'text');
        assert.equal(view.$('#password').attr('autocomplete'), 'off');
        assert.equal(view.$('#password').attr('autocapitalize'), 'off');
        assert.equal(view.$('#password').attr('autocorrect'), 'off');
        assert.equal(view.$('#vpassword').attr('type'), 'text');
        assert.equal(view.$('#vpassword').attr('autocomplete'), 'off');
        assert.equal(view.$('#vpassword').attr('autocomplete'), 'off');
        assert.equal(view.$('#vpassword').attr('autocapitalize'), 'off');
      });

      it('pw field set to password when clicked again', function () {
        view.$('.show-password').click();
        view.$('.show-password').click();
        assert.equal(view.$('#password').attr('type'), 'password');
        assert.equal(view.$('#password').attr('autocomplete'), null);
        assert.equal(view.$('#password').attr('autocapitalize'), null);
        assert.equal(view.$('#password').attr('autocorrect'), null);
        assert.equal($('#vpassword').attr('type'), 'password');
        assert.equal($('#vpassword').attr('autocomplete'), null);
        assert.equal($('#vpassword').attr('autocapitalize'), null);
        assert.equal($('#vpassword').attr('autocorrect'), null);
      });

      it('logs whether the password is shown or hidden', function () {
        view.$('.show-password').click();
        assert.isTrue(TestHelpers.isEventLogged(metrics,
                          'password-view.password.visible'));
        // the password has not been hidden yet.
        assert.isFalse(TestHelpers.isEventLogged(metrics,
                          'password-view.password.hidden'));

        view.$('.show-password').click();
        assert.isTrue(TestHelpers.isEventLogged(metrics,
                          'password-view.password.hidden'));
      });
    });

    describe('show passwordHelper', function () {
      it('set warning opacity to 1 if any password length is less than 8', function () {
        view.$('#password').val('1234');
        view.$('#vpassword').val('12345678');
        view.$('#old_password').val('12345678');
        view.$('#new_password').val('12345678');
        view.onPasswordKeyUp();
        assert.equal(view.$('.input-help').css('opacity'), '1');
        assert.equal(view.$('.input-help-forgot-pw').css('opacity'), '1');
      });
    });

    describe('hide passwordHelper', function () {
      it('set warning opacity to 0 if password length is greater than or equal to 8', function () {
        view.$('#password').val('12345678');
        view.$('#vpassword').val('12345678');
        view.$('#old_password').val('12345678');
        view.$('#new_password').val('123456789');
        view.onPasswordKeyUp();
        assert.equal(view.$('.input-help').css('opacity'), '0');
        assert.equal(view.$('.input-help-forgot-pw').css('opacity'), '1');
      });
    });
  });
});

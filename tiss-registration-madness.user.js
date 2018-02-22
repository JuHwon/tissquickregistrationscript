// ==UserScript==
// @name       TISS Registration Madness
// @namespace  JuHwon
// @version    1.1
// @description  Just Madness
// @match      https://tiss.tuwien.ac.at/*
// @copyright  2016+, JuHwon
// @require    http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

(function TissRegistrationMadnessClass() {

    var options = {
        // option do enable autoregistration
        autoRegistration: true,

        // option to enable autoreload if the reigster button is not available
        autoReload: false,

        // interval to refresh the page if register button not available
        refreshInterval: 500,

        // course number
        courseNumber: '180.764',

        // type of registration, available options: lva, group, exam
        registrationType: 'exam',

        // section of registration button, e.g. group name like "Gruppe 3", or name of exam
        // this option is not available with the registration type 'lva'
        registerSection: '',

        // which section to choose if more than one section with the same name exists
        // setting the value to null will just choose the first one found
        // inSectionIndex: null -> first "registerSection" found will be chosen
        // "inSectionIndex: 4" -> fourth section with name of "registerSection" will be chosen
        inSectionIndex: null,

        // semester of the desired course
        semester: '2017W',

        // if you got multiple study codes, configure the desired one without the dot (e.g. 033526)
        studyCode: '',

        // option to enable/disable logs on page
        enableLog: true,

        // option to specify a time to start the script, it will reload the page at the specified time
        // set to null to disable the specific startTime
        startTime: {
            year: 2018,
            month: 2,
            day: 18,

            hour: 11,
            minute: 59,
            second: 50
        }
    };

    var state = {
        NONE: 0,
        SUCCESS: 1,
        REGISTER: 2,
        STUDY_SELECTION: 3,
        ACKNOWLEDGE: 5,

        // errors
        WRONG_COURSE: 10,
        WRONG_SEMESTER: 11,
        WRONG_TAB: 12,

        // not found
        SECTION_NOTFOUND: 20,
        BUTTON_NOTFOUND: 21
    };

    var tabs = {
        lva: 'LVA-Anmeldung',
        group: 'Gruppen',
        exam: 'Prüfungen'
    };

    var LOG_AREA_SYLE = 'color: black; background-color: #FFFCD9; font-size: 10pt; padding-top: 1px;';
    var LOG_AREA_ID = 'trmLog';
    var ERROR_AREA_STYLE = 'color: red; font-weight: bold; font-size: 14pt; padding: 8px 0px;';
    var ERROR_AREA_ID = 'trmError';
    var SUCCESS_AREA_STYLE = 'color: green; font-weight: bold; font-size: 14pt; padding: 8px 0px;';
    var SUCCESS_AREA_ID = 'trmSuccess';

    this.init = function() {
        this.state = state.NONE;
        this.extendJQuery();

        // delay start if specified
        var timeToStart;
        if (options.startTime &&
            (timeToStart = new getDate(options.startTime) - new Date()) > 0) {
            setTimeout(this.reloadPage, timeToStart);
            this.setCountDown(timeToStart);
        } else {
            this.injectArea(LOG_AREA_ID, LOG_AREA_SYLE, 'Information Log');
            this.injectArea(ERROR_AREA_ID, ERROR_AREA_STYLE);
            this.injectArea(SUCCESS_AREA_ID, SUCCESS_AREA_STYLE);
            if (options.registrationType == 'lva') {
                options.registerSection = 'LVA-Anmeldung';
            }
            this.start();
        }
    };

    this.start = function() {
        this.pageLog('TISS Registration Madness started');
        this.pageLog('LVA Number: ' + this.getLvaNumber());
        this.pageLog('LVA Name: ' + this.getLvaName());
        this.pageLog('SelectedTab: ' + this.getSelectedTab());

        var foundStudySelection = !!this.getStudySelection();
        var foundConfirmButton = !!this.getConfirmButton();
        var foundAcknowledgeButton = !!this.getAcknowledgeButton();

        // identify registration step & process
        if(this.properSemesterSelected() && !this.isRegistered()) {
            if (this.properTabSelected()){
                this.register();
            } else if (foundStudySelection) {
                this.studySelection();
            } else if (foundConfirmButton) {
                this.confirm();
            } else if (foundAcknowledgeButton) {
                this.acknowledge();
            } else {
                this.state = state.NONE;
            }
        }

        switch(this.state) {
            case state.SUCCESS:
                this.pageSuccess('You are successfully registered.');
                break;
            case state.WRONG_COURSE:
                this.pageError('Wrong course selected. Expected: ' + options.courseNumber);
                break;
            case state.WRONG_SEMESTER:
                this.pageError('Wrong semester selected. Expected: ' + options.semester);
                break;
            case state.WRONG_TAB:
                this.pageError('Wrong Tab selected. Tab did not match ' + tabs[options.registrationType]);
                break;
            case state.SECTION_NOTFOUND:
                this.pageError('Could not find section with title "' + options.registerSection + '"');
                break;
            case state.BUTTON_NOTFOUND:
                this.pageError('Could not find register button.');
                break;
            case state.NONE:
                this.pageError('Could not determine registration step.');
                break;
        }
    };

    this.register = function() {
        this.state = state.REGISTER;
        if(!this.properCourseSelected()) {
            return;
        }

        var section = this.getSection();
        if (!section) {
            this.state = state.SECTION_NOTFOUND;
            return;
        }

        this.highlightElement(this.getSectionLabel());

        var registerButton = this.getRegisterButton(section);
        if (!registerButton) {
            this.state = state.BUTTON_NOTFOUND;
            if (options.autoReload) {
                setTimeout(this.reloadPage, options.refreshInterval);
            }
            return;
        }
        this.highlightElement(registerButton);

        if (options.autoRegistration) {
            registerButton.click();
        }
    };

    this.studySelection = function() {
        this.state = state.STUDY_SELECTION;
        var selection = this.getStudySelection();
        this.pageError('');
        if (options.studyCode) {
            this.setSelectedValue(selection, options.studyCode);
        }
        this.confirm();
    };

    this.confirm = function() {
        var confirmButton = this.getConfirmButton();
        this.highlightElement(confirmButton);
        if (options.autoRegistration) {
            confirmButton.click();
        }
    };

    this.acknowledge = function() {
        this.state = state.ACKNOWLEDGE;
        var button = this.getAcknowledgeButton();
        this.highlightElement(button);
        if (options.autoRegistration) {
            button.click();
        }
    };

    this.isRegistered = function() {
        var section = this.getSection();
        if(!section || !this.getDeregisterButton(section)) {
            return false;
        }
        this.highlightElement(this.getSectionLabel());
        this.state = state.SUCCESS;
        return true;
    };

    ///////////////////////// Props

    var _lvaNumber;
    this.getLvaNumber = function() {
       return _lvaNumber || (_lvaNumber = $('#contentInner h1 span:first').text().trim());
    };

    var _lvaName;
    this.getLvaName = function() {
        return _lvaName || (_lvaName = $('#contentInner h1').textNodes().text().trim());
    };

    var _selectedTab;
    this.getSelectedTab = function() {
        return _selectedTab || (_selectedTab = $('li.ui-tabs-selected').text().trim());
    };

    var _sectionLabel;
    this.getSectionLabel = function() {
        if (!_sectionLabel) {
            _sectionLabel = $(".groupWrapper .groupHeadertrigger span").filter(function () {
                return $(this).text().trim() === options.registerSection;
            });
            _sectionLabel = _sectionLabel.length > 1
                ? $(_sectionLabel[options.inSectionIndex == null ? 0 : (options.inSectionIndex - 1)])
                : _sectionLabel;
        }
        return _sectionLabel;
    };

    var _section;
    this.getSection = function() {
        return _section || (_section = this.getSectionLabel().closest('.groupWrapper'));
    };

    var _acknowledgeButton;
    // returns null if button is not found
    this.getAcknowledgeButton = function() {
        var button = _acknowledgeButton || (_acknowledgeButton = $("form#confirmForm input:submit[value='Ok']"));
        return button.length === 0 ? null : button;
    };

    var _registerButton;
    // returns null if button is not found
    this.getRegisterButton = function(section) {
        if (!_registerButton) {
            _registerButton = $(section).find('input:submit[value="Anmelden"]');

            // fallback solutions, since it seems the value is not always the same
            if (_registerButton.length === 0) {
                _registerButton = $(section).find('input:submit[value="Voranmelden"]');
            }

            if (_registerButton.length === 0) {
                _registerButton = $(section).find('input:submit[value="Voranmeldung"]');
            }

            _registerButton = _registerButton.length === 0 ? null : _registerButton;
        }

        return _registerButton;
    };

    var _confirmButton;
    // returns null if button is not found
    this.getConfirmButton = function() {
        return _confirmButton || (_confirmButton = this.getRegisterButton($('form#regForm')));
    };

    var _studySelection;
    // returns null if button is not found
    this.getStudySelection = function() {
        var selection = _studySelection || (_studySelection = $("#regForm").find('select[name="regForm:studyCode"]'));
        return selection.length === 0 ? null : selection;
    };

    var _deregisterButton;
    // returns null if button is not found
    this.getDeregisterButton = function(section) {
        var button = _deregisterButton || (_deregisterButton || $(section).find('input:submit[value="Abmelden"]'));
        return button.length === 0 ? null : button;
    };

    //////////////////////// Util

    this.highlightElement = function(element) {
        if (options.enableLog) {
            element.css('background-color', 'lightgreen');
        }
    };

    this.setSelectedValue = function (element, value) {
        element.find('option').removeAttr('selected');
        element.find('option[value="' + value + '"]').attr('selected', 'selected');
    };

    this.pageError = function(msg) {
        if (options.enableLog) {
            var errorLog = $('#' + ERROR_AREA_ID);
            errorLog.html(msg);
        }
    };

    this.pageSuccess = function(msg) {
        if (options.enableLog) {
            var successLog = $('#' + SUCCESS_AREA_ID);
            successLog.html(msg);
        }
    };

    this.pageLog = function(msg) {
        if (options.enableLog) {
            var log = $('#' + LOG_AREA_ID);
            log.html(log.html() + '<br />' + msg);
        }
    };

    this.injectArea = function(id, style, title, force) {
        if (options.enableLog || force) {
            $('#contentInner').before(
                '<div id="' + id + '" style="' + style + '">' +
                    (title ? '<h2>' + title + '</h2>' : '') +
                '</div>'
            );
        }
    };

    this.reloadPage = function() {
        location.reload();
    };

    this.setCountDown = function(milliseconds) {
        this.injectArea('trmCountdown', LOG_AREA_SYLE, '', true);
        var ms = milliseconds;
        var logCountdown = function() {
            $('#trmCountdown').html('Script will start in ' + Math.round(ms/1000) + ' seconds.');
        };
        setInterval(function() {
            ms -= 1000;
            logCountdown();
        }, 1000);
    };

    this.extendJQuery = function() {
        jQuery.fn.textNodes = function() {
            return $(this)
                .contents()
                .filter(function() {
                    return this.nodeType === Node.TEXT_NODE;
                });
        };
    };

    this.getDate = function(date) {
        return new Date(
            date.year,
            date.month-1,
            date.day,
            date.hour,
            date.minute,
            date.second
        );
    };

    //////////////////////// Validation

    this.properCourseSelected = function() {
        var lvaNumber = this.getLvaNumber().replace(/[^\d]/, '');
        if (lvaNumber !== options.courseNumber.replace(/[^\d]/, '')) {
            this.state = state.WRONG_COURSE;
            return false;
        }
        return true;
    };

    this.properSemesterSelected = function() {
        var subheader = $('#contentInner #subHeader').text().trim();
        if (subheader.indexOf(options.semester) === -1) {
            this.state = state.WRONG_SEMESTER;
            return false;
        }
        return true;
    };

    this.properTabSelected = function() {
        if (this.getSelectedTab() !== tabs[options.registrationType]) {
            this.state = state.WRONG_TAB;
            return false;
        }
        return true;
    };

    this.init();
})();

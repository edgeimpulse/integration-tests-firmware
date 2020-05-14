export class Notify {
    static isAlertOpen() {
        if ($('.swal2-container').isExisting()) {
            browser.waitUntil(() => {
                return $('.swal2-container').isDisplayed();
            }, 1000);
        }
        return $('.swal2-container').isDisplayed();
    }

    static getAlertText() {
        return $('.swal2-title').getText() + ' - ' + $('.swal2-content').getText();
    }

    static acceptAlert() {
        let containerId = $('.swal2-popup').getAttribute('id');

        $('.swal2-confirm').click();
        browser.waitUntil(() => {
            return !$('#' + containerId).isDisplayed();
        }, 15000);
    }

    static sendAlertText(msg: string) {
        $('.swal2-input').setValue(msg);
    }

    static notificationExists() {
        return $('span[data-notify="message"]').isDisplayed();
    }
}

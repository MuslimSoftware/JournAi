#[cfg(target_os = "ios")]
use objc2::runtime::AnyObject;
#[cfg(target_os = "ios")]
use objc2::msg_send;
#[cfg(target_os = "ios")]
use objc2_ui_kit::{UIScrollView, UIScrollViewContentInsetAdjustmentBehavior};
#[cfg(target_os = "ios")]
use tauri::WebviewWindow;

#[cfg(target_os = "ios")]
pub fn configure_webview_for_fullscreen(webview_window: &WebviewWindow) {
    let _ = webview_window.with_webview(|webview| unsafe {
        let wk_webview: *mut AnyObject = webview.inner().cast();
        let scroll_view: *mut UIScrollView = msg_send![wk_webview, scrollView];

        if !scroll_view.is_null() {
            let scroll_view = &*scroll_view;
            scroll_view.setContentInsetAdjustmentBehavior(
                UIScrollViewContentInsetAdjustmentBehavior::Never
            );
        }
    });
}

#[cfg(not(target_os = "ios"))]
pub fn configure_webview_for_fullscreen(_webview_window: &tauri::WebviewWindow) {
}

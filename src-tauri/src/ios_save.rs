//! Save video to the Photos library without adding to a custom album (iOS only).
#![cfg(target_os = "ios")]

use std::path::Path;
use std::sync::{mpsc, Arc, Mutex};

use block2::RcBlock;
use dispatch2::dispatch_block_t;
use objc2_foundation::{NSString, NSURL};
use objc2_photos::{
  PHAssetChangeRequest, PHAuthorizationStatus, PHPhotoLibrary, PHAccessLevel,
};

fn ensure_photos_access() -> Result<(), String> {
  let status = unsafe { PHPhotoLibrary::authorizationStatusForAccessLevel(PHAccessLevel::AddOnly) };
  if status == PHAuthorizationStatus::Authorized || status == PHAuthorizationStatus::Limited {
    return Ok(());
  }
  if status == PHAuthorizationStatus::Denied || status == PHAuthorizationStatus::Restricted {
    return Err("Photos access denied. Enable it in Settings > TripRender > Photos.".to_string());
  }

  let (tx, rx) = mpsc::channel();
  let block = RcBlock::new(move |s: PHAuthorizationStatus| {
    let _ = tx.send(s);
  });
  unsafe {
    PHPhotoLibrary::requestAuthorizationForAccessLevel_handler(PHAccessLevel::AddOnly, &block);
  }

  match rx.recv() {
    Ok(PHAuthorizationStatus::Authorized) | Ok(PHAuthorizationStatus::Limited) => Ok(()),
    Ok(PHAuthorizationStatus::Denied) | Ok(PHAuthorizationStatus::Restricted) => {
      Err("Photos access denied.".to_string())
    }
    Ok(PHAuthorizationStatus::NotDetermined) => Err("Photos permission not determined.".to_string()),
    Ok(_) => Err("Unexpected Photos authorization status.".to_string()),
    Err(_) => Err("Photos authorization request failed.".to_string()),
  }
}

/// Imports `path` into the user's Photos library (Recents / Library). Does not create a custom album.
pub fn save_video_to_library(path: &str) -> Result<(), String> {
  ensure_photos_access()?;

  let p = Path::new(path);
  if !p.exists() {
    return Err(format!("Video file not found at {path}"));
  }

  let path_str = p
    .to_str()
    .ok_or_else(|| "Video path is not valid UTF-8".to_string())?;

  let ns_path = NSString::from_str(path_str);
  let url = NSURL::fileURLWithPath(&ns_path);

  let nil_note: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
  let nil_note_clone = Arc::clone(&nil_note);

  let change_block = RcBlock::new(move || {
    let created = unsafe { PHAssetChangeRequest::creationRequestForAssetFromVideoAtFileURL(&url) };
    if created.is_none() {
      let mut g = nil_note_clone.lock().unwrap();
      *g = Some(
        "Photos could not import this file (creationRequestForAssetFromVideo returned nil). Check MP4 format."
          .to_string(),
      );
    }
  });

  let library = unsafe { PHPhotoLibrary::sharedPhotoLibrary() };
  let ptr = RcBlock::as_ptr(&change_block) as dispatch_block_t;

  let photos_err = unsafe { library.performChangesAndWait_error(ptr) };

  drop(change_block);

  if let Err(e) = photos_err {
    return Err(e.localizedDescription().to_string());
  }

  if let Some(msg) = nil_note.lock().unwrap().clone() {
    return Err(msg);
  }

  Ok(())
}

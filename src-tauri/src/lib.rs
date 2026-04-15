#[cfg(target_os = "ios")]
mod ios_save;

#[tauri::command]
fn save_video_to_photos_library(path: String) -> Result<(), String> {
  #[cfg(target_os = "ios")]
  {
    return ios_save::save_video_to_library(&path);
  }
  #[cfg(not(target_os = "ios"))]
  {
    let _ = path;
    Err("save_video_to_photos_library is only available on iOS".to_string())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_os::init());

  builder
    .invoke_handler(tauri::generate_handler![save_video_to_photos_library])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

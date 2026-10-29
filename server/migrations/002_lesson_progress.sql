CREATE TABLE IF NOT EXISTS lesson_progress (
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES lesson_videos(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_video
    ON lesson_progress(video_id);

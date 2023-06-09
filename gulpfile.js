import gulp from 'gulp';
import rename from 'gulp-rename';
import terser from 'gulp-terser';
import cssnano from 'gulp-cssnano';
import replace from 'gulp-replace';
import fs from 'fs';

function styles() {
    return gulp
        .src('src/*.css')
        .pipe(cssnano())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./public'));
}

function scripts() {
    return gulp
        .src('src/*.js')
        .pipe(
            replace('{{youtube.css}}', () => {
                return `${fs.readFileSync('./public/youtube.min.css', 'utf8')}`;
            })
        )
        .pipe(terser())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./public'));
}

gulp.task('default', gulp.parallel(styles, scripts));

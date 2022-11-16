const gulp = require('gulp'),
    rename = require('gulp-rename'),
    terser = require('gulp-terser'),
    cssnano = require('gulp-cssnano'),
    replace = require('gulp-replace'),
    fs = require('fs');

function styles() {
    return gulp
        .src('./src/*.css')
        .pipe(cssnano())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./public'));
}

function scripts() {
    return gulp
        .src('./src/*.js')
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

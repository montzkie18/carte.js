var gulp = require('gulp'),
	gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    concat = require('gulp-concat'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify');

// define the default task and add the watch task to it
gulp.task('default', ['build-dev']);

// configure the jshint task
gulp.task('jshint', function() {
  return gulp.src('src/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('build-dev', function() {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('carte.js'))
    .pipe(sourcemaps.write('./', {includeContent: false, sourceRoot: '../src'}))
    .pipe(gulp.dest('build'));
});

gulp.task('build-prod', function() {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('carte.min.js'))
    .pipe(uglify()) 
    .pipe(sourcemaps.write('./', {includeContent: false, sourceRoot: '../src'}))
    .pipe(gulp.dest('build'));
});

// configure which files to watch and what tasks to use on file changes
gulp.task('watch', function() {
  gulp.watch('src/**/*.js', ['jshint', 'build-dev']);
});


cmake_minimum_required(VERSION 3.16)
project(osx_audio LANGUAGES Swift)

# Where to put the resulting .dylib
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})

# Build a shared library from bridging.swift
add_library(audiocap SHARED src/native/bridging.swift)

# Link the Apple frameworks needed
target_link_libraries(audiocap
    "-framework ScreenCaptureKit"
    "-framework CoreMedia"
    "-framework Foundation"
)
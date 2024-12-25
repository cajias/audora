# Makefile for building libaudiocap.dylib using swiftc
# ------------------------------------------------------------------------------
# This Makefile:
#   1. Creates a build directory (if it doesn’t exist).
#   2. Compiles your Swift sources into a dynamic library.
#   3. Cleans up the build artifacts when you run `make clean`.
#
# “Hardened” Considerations:
#   - We pass several compiler flags to ensure library evolution (e.g., -enable-library-evolution).
#   - You can adjust the macOS deployment target to enforce stricter runtime checks.
#   - For a truly hardened runtime, you would also sign your library with codesign,
#     which is typically handled outside of a simple Makefile (or in an additional target).
# ------------------------------------------------------------------------------

# The base name of the library (without "lib" prefix).
LIB_NAME      := audiocap

# Swift source files. Update as needed (e.g. bridging.swift, AudioCapture.swift, etc.).
SWIFT_SOURCES := $(wildcard src/**/*.swift)

# Directory to hold intermediate and final build artifacts.
BUILD_DIR     := build

# The resulting library file name.
DYLIB_FILE    := lib$(LIB_NAME).dylib

# Swift compiler invocation flags.
# Adjust the deployment target (“-target”) to match your needs (e.g., 10.13, 10.15).
SWIFTFLAGS    := \
  -emit-library \
  -emit-module \
  -emit-module-path $(BUILD_DIR) \
  -module-name $(LIB_NAME) \
  -enable-library-evolution \
  -target x86_64-apple-macos15.1 \
  -swift-version 6 \
  -Onone \
  -warnings-as-errors

# Frameworks we want to link. Remove or add frameworks as appropriate.
# Example frameworks for audio capture might include ScreenCaptureKit, AVFoundation, CoreMedia, etc.
FRAMEWORKS    := \
  -framework ScreenCaptureKit \
  -framework CoreMedia \
  -framework Foundation \
  -framework AVFoundation

# We explicitly set an rpath so that the library can locate frameworks at runtime if needed.
# If you have additional rpath requirements, append them here.
LINKFLAGS     := \
  -Xlinker -rpath \
  -Xlinker @loader_path

# ------------------------------------------------------------------------------

.PHONY: all clean

# The default target compiles the Swift sources into a dynamic library.
all: $(BUILD_DIR)/$(DYLIB_FILE)

# Actual rule for building the dynamic library.
$(BUILD_DIR)/$(DYLIB_FILE): $(SWIFT_SOURCES)
	@echo ">> Creating/using build directory: $(BUILD_DIR)"
	mkdir -p $(BUILD_DIR)
	@echo ">> Compiling Swift sources into a dynamic library..."
	swiftc $(SWIFTFLAGS) $(FRAMEWORKS) $(LINKFLAGS) -o $@ $^

	@echo ">> Build complete. The resulting library is: $@"
	@echo ">> Swift module artifacts placed in: $(BUILD_DIR)"

# Removes the entire build directory and its artifacts.
clean:
	@echo ">> Removing build directory..."
	rm -rf $(BUILD_DIR)
	@echo ">> Clean complete."
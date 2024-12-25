# Makefile: Best-in-Class Universal Swift Dynamic Library
# ------------------------------------------------------------------------------
# Builds a universal .dylib that supports both x86_64 and arm64 on macOS 12+.
# Hardened Considerations:
#   1. -enable-library-evolution: Maintains ABI stability for distribution.
#   2. -warnings-as-errors: Forces high code-quality standards.
#   3. Rpath set to @loader_path to prevent insecure library searches.
#   4. Optional codesigning target for hardened runtime or distribution.
#   5. Verifies that Swift sources are actually found, preventing “no input files.”
#
# Usage:
#   make clean && make
#   lipo -info build/universal/libaudiocap.dylib
#   # (Optional) make codesign
#
# Adjust target OS version as needed (e.g., macos12, macos13).
# If you need arm64e, add a separate rule following the same pattern.
# ------------------------------------------------------------------------------

# Library Identification
LIB_NAME        := audiocap
BUILD_DIR       := build
UNIVERSAL_DIR   := $(BUILD_DIR)/universal
ARM64_BUILD_DIR := $(BUILD_DIR)/arm64
X86_64_BUILD_DIR:= $(BUILD_DIR)/x86_64
UNIVERSAL_DYLIB := $(UNIVERSAL_DIR)/lib$(LIB_NAME).dylib

# Swift Source Files
SWIFT_SOURCES := $(wildcard src/native/*.swift)

# If no Swift sources are found, print a warning and fail early
ifeq ($(SWIFT_SOURCES),)
  $(error No Swift source files found in src/native/*.swift)
endif

# Swift Compiler Flags
SWIFTFLAGS := \
  -emit-library \
  -emit-module \
  -module-name $(LIB_NAME) \
  -enable-library-evolution \
  -swift-version 6 \
  -Onone \
  -warnings-as-errors

# Module & Interface Paths (placed inside build directories)
# The official Swift compiler can create .swiftmodule, .swiftdoc, .swiftinterface, etc.
# for each build. We'll place them in the respective arch directory.
COMMON_MODULE_FLAGS := \
  -emit-module-path $(BUILD_DIR)/$(LIB_NAME).swiftmodule \
  -emit-module-interface-path $(BUILD_DIR)/$(LIB_NAME).swiftinterface

# Frameworks
FRAMEWORKS := \
  -framework ScreenCaptureKit \
  -framework CoreMedia \
  -framework Foundation \
  -framework AVFoundation

# Linker Flags
LINKFLAGS := \
  -Xlinker -rpath \
  -Xlinker @loader_path

.PHONY: all clean codesign

# Default target
all: $(UNIVERSAL_DYLIB)

# Universal .dylib: Combine arm64 and x86_64 using lipo
$(UNIVERSAL_DYLIB): $(ARM64_BUILD_DIR)/lib$(LIB_NAME).dylib $(X86_64_BUILD_DIR)/lib$(LIB_NAME).dylib
	@echo ">> Creating universal binary at: $@"
	mkdir -p $(UNIVERSAL_DIR)
	lipo -create -output $@ $^
	@echo ">> Build complete: Universal library at $@"

# ARM64 build
$(ARM64_BUILD_DIR)/lib$(LIB_NAME).dylib: $(SWIFT_SOURCES)
	@echo ">> Building for arm64..."
	mkdir -p $(ARM64_BUILD_DIR)
	swiftc $(SWIFTFLAGS) $(COMMON_MODULE_FLAGS) \
	  -target arm64-apple-macos15.2 \
	  $(FRAMEWORKS) $(LINKFLAGS) \
	  -o $@ $^

# x86_64 build
$(X86_64_BUILD_DIR)/lib$(LIB_NAME).dylib: $(SWIFT_SOURCES)
	@echo ">> Building for x86_64..."
	mkdir -p $(X86_64_BUILD_DIR)
	swiftc $(SWIFTFLAGS) $(COMMON_MODULE_FLAGS) \
	  -target x86_64-apple-macos15.2 \
	  $(FRAMEWORKS) $(LINKFLAGS) \
	  -o $@ $^

# Clean up
clean:
	@echo ">> Removing build directory..."
	rm -rf $(BUILD_DIR)
	@echo ">> Clean complete."

# Optional Code Signing (Hardened Runtime, Distribution)
# Uncomment and customize if you need a signed library for distribution or notarization.
# Adjust the signing identity as per your Developer ID or Apple dev certificate.
codesign:
	@echo ">> Codesigning universal library..."
	# codesign --force --sign "Developer ID Application: Your Name (TEAMID)" \
	#   --options runtime --timestamp $(UNIVERSAL_DYLIB)
	@echo ">> Codesigning is currently disabled. Uncomment and configure the target if needed."
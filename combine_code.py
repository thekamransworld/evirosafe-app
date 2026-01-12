import os

# The name of the output file
OUTPUT_FILE = "full_project_code.txt"

# Folders to exclude (to keep the file size manageable)
EXCLUDE_DIRS = {
    'node_modules', 
    '.git', 
    'dist', 
    'build', 
    '.vscode', 
    'coverage',
    'public' # Optional: exclude public assets if not needed
}

# File extensions to include
INCLUDE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.sql'
}

# Specific files to exclude (like lock files which are huge)
EXCLUDE_FILES = {
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'full_project_code.txt', # Don't include the output file itself
    'combine_code.py'        # Don't include this script
}

def is_text_file(filename):
    return any(filename.endswith(ext) for ext in INCLUDE_EXTENSIONS)

def combine_files():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Walk through the directory tree
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                if file in EXCLUDE_FILES:
                    continue
                
                if is_text_file(file):
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                            # Write a header for each file
                            outfile.write(f"\n{'='*50}\n")
                            outfile.write(f"FILE: {file_path}\n")
                            outfile.write(f"{'='*50}\n\n")
                            
                            outfile.write(content)
                            outfile.write("\n")
                            
                        print(f"Added: {file_path}")
                    except Exception as e:
                        print(f"Skipping {file_path} due to error: {e}")

    print(f"\nSuccess! All code combined into: {OUTPUT_FILE}")

if __name__ == "__main__":
    combine_files()
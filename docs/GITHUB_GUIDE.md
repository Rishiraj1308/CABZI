# GitHub Guide: How to Push Your "Cabzi" Project

This guide provides simple, step-by-step instructions on how to upload your entire "Cabzi" project to a new GitHub repository from your local machine using the command line.

---

## Prerequisites

*   You have a [GitHub account](https://github.com/signup).
*   You have [Git installed](https://git-scm.com/downloads) on your computer.

---

## Step 1: Create a New, Empty Repository on GitHub

First, you need a place on GitHub to store your project.

1.  **Go to GitHub:** Log in to your GitHub account.
2.  **Create New Repository:** Click on the `+` icon in the top-right corner and select **"New repository"**.
3.  **Name Your Repository:**
    *   **Repository name:** `cabzi-app` (or any name you prefer).
    *   **Description:** (Optional) "A full-stack CPR (Cure-Path-ResQ) ecosystem built with Next.js and Firebase."
4.  **Set to Public:** Make sure **"Public"** is selected so that recruiters and others can see your work.
5.  **❌ DO NOT Initialize:** **This is the most important step.** Do **not** check any of the boxes for "Add a README file," "Add .gitignore," or "Choose a license." Your local project already has these files. We need a completely empty repository.
6.  **Create Repository:** Click the **"Create repository"** button.
7.  **Copy the URL:** On the next page, GitHub will show you some commands. All we need is the repository URL. It will look like this: `https://github.com/YOUR_USERNAME/cabzi-app.git`. Copy this URL.

---

## Step 2: Use the Command Line to Upload Your Project

Now, open a terminal or command prompt inside your project's folder.

1.  **Open a Terminal in Your Project Folder:**
    *   Navigate to your main `cabzi` project directory in your terminal.

2.  **Run the Following Git Commands:**
    *   Run these commands one by one.

    ```bash
    # Step 1: Initialize a new Git repository in your project folder
    # The '-b main' part sets the default branch name to 'main'
    git init -b main

    # Step 2: Add all the files in your project to be tracked by Git
    # The '.' means "all files and folders in the current directory"
    git add .

    # Step 3: Save your files' current state in a "commit"
    # The -m flag lets you write a commit message.
    git commit -m "Initial commit: Cabzi CPR Ecosystem MVP"

    # Step 4: Link your local repository to the one you created on GitHub
    # IMPORTANT: Replace the URL with the one you copied from your GitHub page.
    git remote add origin https://github.com/YOUR_USERNAME/cabzi-app.git

    # Step 5: Push (upload) your committed code to GitHub
    # The '-u' flag links your local 'main' branch to the remote 'origin/main' branch
    git push -u origin main
    ```

### That's It!

After the `git push` command finishes, refresh your GitHub repository page. You will see all your project files there. You can now share the link to this repository with anyone!

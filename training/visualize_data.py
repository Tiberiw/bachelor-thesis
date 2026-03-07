import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import os

METADATA_CSV_PATH = 'mp3_metadata.csv'
PLOTS_OUTPUT_FOLDER = 'visualizations'

# Create output folder if it doesn't exist
os.makedirs(PLOTS_OUTPUT_FOLDER, exist_ok=True)

def save_plot(filename):
    """Helper to save plots"""
    filepath = os.path.join(PLOTS_OUTPUT_FOLDER, filename)
    plt.savefig(filepath, dpi=150, bbox_inches='tight')
    print(f"Saved plot: {filepath}")
    plt.close()

if __name__ == "__main__":
    if not os.path.exists(METADATA_CSV_PATH):
        print(f"'{METADATA_CSV_PATH}' not found. Please run the extraction script first.")
        exit()

    df = pd.read_csv(METADATA_CSV_PATH)
    print(f"Loaded {len(df)} records from '{METADATA_CSV_PATH}'")

    # --- Basic Data Cleaning & Preparation ---
    # Convert duration to minutes for better readability in some plots
    df['duration_minutes'] = df['duration_seconds'] / 60

    # Set a nice style for plots
    sns.set_theme(style="whitegrid")
    plt.rcParams['figure.figsize'] = (10, 6) # Default figure size

    # --- 1. Distribution of File Sizes ---
    plt.figure()
    sns.histplot(df['filesize_mb'], kde=True, bins=50)
    plt.title('Distribution of MP3 File Sizes', fontsize=16)
    plt.xlabel('File Size (MB)', fontsize=12)
    plt.ylabel('Number of Files', fontsize=12)
    # Consider log scale if very skewed
    # plt.xscale('log')
    save_plot('01_filesize_distribution.png')

    # --- 2. Distribution of Durations (IN SECONDS) --- MODIFIED SECTION
    plt.figure()
    # Use the original 'duration_seconds' column
    # Filter out extreme outliers if they skew the plot too much for presentation
    # For example, plot 99% of the data if there are very long files
    # This is often useful when dealing with raw seconds as outliers can be very large.
    quantile_99 = df['duration_seconds'].quantile(0.99)
    df_filtered_duration = df[df['duration_seconds'] <= quantile_99]

    # If filtering removed too much data or all data, fall back to original
    if df_filtered_duration.empty or len(df_filtered_duration) < 0.1 * len(df): # e.g., less than 10% data left
        print("Warning: Quantile filtering for duration removed too much data, plotting all duration data.")
        sns.histplot(df['duration_seconds'].dropna(), kde=True, bins=50)
    else:
        sns.histplot(df_filtered_duration['duration_seconds'], kde=True, bins=50)

    plt.title('Distribution of MP3 Durations', fontsize=16)
    plt.xlabel('Duration (Seconds)', fontsize=12) # Changed label
    plt.ylabel('Number of Files', fontsize=12)
    save_plot('02_duration_distribution_seconds.png') # Optionally change filename

    # --- 3. Distribution of Bitrates ---
    # Bitrates are often discrete, so a count plot might be better than histogram
    plt.figure(figsize=(12, 7))
    # Filter out Nones if any, and count common values
    common_bitrates = df['bitrate_kbps'].dropna().astype(int).value_counts().nlargest(15)
    sns.barplot(x=common_bitrates.index, y=common_bitrates.values, palette="viridis")
    plt.title('Top 15 Most Common MP3 Bitrates', fontsize=16)
    plt.xlabel('Bitrate (kbps)', fontsize=12)
    plt.ylabel('Number of Files', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    save_plot('03_bitrate_distribution.png')

    # --- 4. Distribution of Sample Rates ---
    plt.figure()
    common_samplerates = df['samplerate_khz'].dropna().astype(float).value_counts().nlargest(10)
    sns.barplot(x=common_samplerates.index, y=common_samplerates.values, palette="mako")
    plt.title('Top 10 Most Common MP3 Sample Rates', fontsize=16)
    plt.xlabel('Sample Rate (kHz)', fontsize=12)
    plt.ylabel('Number of Files', fontsize=12)
    save_plot('04_samplerate_distribution.png')

    # --- 5. Channels (Mono vs. Stereo) ---
    plt.figure(figsize=(7, 7))
    channel_counts = df['channels'].value_counts()
    channel_labels = {1: 'Mono (1 Channel)', 2: 'Stereo (2 Channels)'}
    # Handle potential other channel counts if they exist, lump into 'Other'
    filtered_channel_counts = pd.Series(dtype='int')
    for idx, val in channel_counts.items():
        if idx in channel_labels:
            filtered_channel_counts[channel_labels[idx]] = val
        else:
            if 'Other Channels' not in filtered_channel_counts:
                filtered_channel_counts['Other Channels'] = 0
            filtered_channel_counts['Other Channels'] += val

    if not filtered_channel_counts.empty:
        plt.pie(filtered_channel_counts, labels=filtered_channel_counts.index, autopct='%1.1f%%',
                startangle=90, colors=sns.color_palette("pastel"))
        plt.title('Audio Channel Distribution', fontsize=16)
        save_plot('05_channel_distribution.png')
    else:
        print("No channel data to plot.")


    # --- ID3 Tag based visualizations (handle 'Unknown' and NaN) ---
    df_tagged = df.replace('Unknown', np.nan).dropna(subset=['artist', 'genre', 'year'])

    if not df_tagged.empty:
        # --- 6. Top Genres ---
        plt.figure(figsize=(12, 8))
        top_n_genres = 15
        genre_counts = df_tagged['genre'].value_counts().nlargest(top_n_genres)
        if not genre_counts.empty:
            sns.barplot(x=genre_counts.values, y=genre_counts.index, palette="rocket", orient='h')
            plt.title(f'Top {top_n_genres} Music Genres', fontsize=16)
            plt.xlabel('Number of Files', fontsize=12)
            plt.ylabel('Genre', fontsize=12)
            save_plot('06_top_genres.png')
        else:
            print("Not enough genre data to plot after filtering 'Unknown'.")

        # --- 7. Top Artists ---
        plt.figure(figsize=(12, 8))
        top_n_artists = 15
        artist_counts = df_tagged['artist'].value_counts().nlargest(top_n_artists)
        if not artist_counts.empty:
            sns.barplot(x=artist_counts.values, y=artist_counts.index, palette="crest", orient='h')
            plt.title(f'Top {top_n_artists} Artists', fontsize=16)
            plt.xlabel('Number of Files', fontsize=12)
            plt.ylabel('Artist', fontsize=12)
            save_plot('07_top_artists.png')
        else:
            print("Not enough artist data to plot after filtering 'Unknown'.")

        # --- 8. Distribution by Year ---
        # Ensure 'year' is numeric and handle potential errors
        df_tagged['year'] = pd.to_numeric(df_tagged['year'], errors='coerce')
        df_tagged_year = df_tagged.dropna(subset=['year'])
        # Filter for sensible years (e.g., after 1900 and not in the future)
        current_year = pd.Timestamp.now().year
        df_tagged_year = df_tagged_year[(df_tagged_year['year'] > 1900) & (df_tagged_year['year'] <= current_year)]

        if not df_tagged_year.empty:
            plt.figure(figsize=(14, 7))
            # Group by year and count, then plot as a line or bar
            year_counts = df_tagged_year['year'].value_counts().sort_index()
            if len(year_counts) > 25 : # Use line plot if many years
                sns.lineplot(x=year_counts.index, y=year_counts.values, marker='o')
                plt.ylabel('Number of Files (Line)', fontsize=12)
            else: # Use bar plot if fewer distinct years
                sns.barplot(x=year_counts.index.astype(int), y=year_counts.values, color=sns.color_palette("coolwarm", 1)[0])
                plt.ylabel('Number of Files (Bar)', fontsize=12)
                plt.xticks(rotation=45, ha='right')

            plt.title('Distribution of Files by Year', fontsize=16)
            plt.xlabel('Year', fontsize=12)
            save_plot('08_year_distribution.png')
        else:
            print("Not enough valid year data to plot after filtering.")
    else:
        print("Not enough tagged data (artist, genre, year) to create tag-based plots after filtering 'Unknown'.")

    print(f"\nAll visualizations saved to '{PLOTS_OUTPUT_FOLDER}' folder.")
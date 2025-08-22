import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from streamlit_folium import st_folium
import folium

st.markdown(
    """
    <style>
    #MainMenu {visibility: hidden;}
    button[title="Share this app"], .stDeployButton, [data-testid="stDeployButton"] {display: none !important;}
    header [data-testid="stHeader"] {display: none !important;}
    .leaflet-control-attribution {display: none !important;}
    </style>
    """,
    unsafe_allow_html=True
)

# Load geocoded data
islands_df = pd.read_csv('complete_all_states_islands_geocoded.csv')

# Sidebar controls
st.sidebar.header("Filter & Explore")
view_option = st.sidebar.radio("View", ["Dashboard", "Interactive Map"], index=0)

if view_option == "Dashboard":
    selected_group = st.sidebar.selectbox(
        "Select Island Group", 
        ['All Groups'] + sorted(islands_df['Group/Region'].unique().tolist()),
        key="dashboard_group"
    )
    if selected_group == 'All Groups':
        filtered_df = islands_df
    else:
        filtered_df = islands_df[islands_df['Group/Region'] == selected_group]
    selected_island = st.sidebar.selectbox(
        "Select Island", 
        ['All Islands'] + sorted(filtered_df['Island Name'].unique().tolist()),
        key="dashboard_island"
    )
    st.sidebar.download_button(
        "Download All Data (CSV)", data=islands_df.to_csv(index=False), file_name="all_islands_data.csv", key="dashboard_all_data"
    )
    st.sidebar.download_button(
        "Download Current View (CSV)", data=filtered_df.to_csv(index=False), file_name="filtered_islands_data.csv", key="dashboard_filtered_data"
    )
    # show_riverine = False  # Not used in dashboard

    # --- REST OF DASHBOARD CODE GOES HERE ---
    st.set_page_config(page_title="Indian Islands Data Dashboard", layout="wide")
    st.title("🏝️ Indian Islands Data Dashboard")
    if selected_group == 'All Groups':
        st.markdown("""
This comprehensive dashboard visualizes data for **200+ Indian islands** across **ALL 28 states and 8 union territories**:

**Union Territories & Island Groups:**
- **Andaman & Nicobar Islands** (29 islands)
- **Lakshadweep Islands** (12 islands)
- **Diu Island** (1 island)

**Coastal States:**
- **Kerala Islands** (12 islands)
- **Tamil Nadu Islands** (8 islands)
- **Karnataka Islands** (6 islands)
- **Maharashtra Islands** (4 islands)
- **Mumbai Islands** (6 islands)
- **West Bengal Islands** (4 islands)
- **Odisha Islands** (4 islands)
- **Gujarat Islands** (7 islands)
- **Andhra Pradesh Islands** (5 islands)
- **Goa Islands** (2 islands)

**Inland States:**
- **Assam Islands** (6 islands)
- **Bihar Islands** (4 islands)
- **Arunachal Pradesh Islands** (5 islands)
- **Chhattisgarh Islands** (5 islands)
- **Haryana Islands** (5 islands)
- **Himachal Pradesh Islands** (5 islands)
- **Jharkhand Islands** (6 islands)
- **Madhya Pradesh Islands** (7 islands)
- **Manipur Islands** (6 islands)
- **Meghalaya Islands** (6 islands)
- **Mizoram Islands** (6 islands)
- **Nagaland Islands** (7 islands)
- **Punjab Islands** (7 islands)
- **Rajasthan Islands** (7 islands)
- **Sikkim Islands** (6 islands)
- **Telangana Islands** (7 islands)
- **Tripura Islands** (6 islands)
- **Uttar Pradesh Islands** (10 islands)
- **Uttarakhand Islands** (8 islands)

Explore population distribution, climate patterns, tourism levels, and geographic features across the entire Indian subcontinent from the Himalayas to the Indian Ocean.
""")
    else:
        group_islands = islands_df[islands_df['Group/Region'] == selected_group]
        island_count = len(group_islands)
        total_pop = group_islands['Population'].sum()
        st.markdown(f"**🏝️ {selected_group} Islands Analysis**\n\nThis section focuses on the **{island_count} islands** of {selected_group} with a total population of **{total_pop:,}** people.\n\nExplore detailed insights about population distribution, climate patterns, tourism levels, and geographic features specific to {selected_group} islands.")

    # Main dashboard content
    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader("📊 Island Overview")
        # Key metrics
        total_islands = len(filtered_df)
        total_population = filtered_df['Population'].sum()
        avg_area = filtered_df['Area (sq km)'].mean()
        inhabited_islands = len(filtered_df[filtered_df['Population'] > 0])
        metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
        with metric_col1:
            st.metric("Total Islands", total_islands)
        with metric_col2:
            if total_population >= 1000000:
                pop_display = f"{total_population/1000000:.1f}M"
            elif total_population >= 1000:
                pop_display = f"{total_population/1000:.1f}K"
            else:
                pop_display = f"{total_population:,}"
            st.metric("Total Population", pop_display)
        with metric_col3:
            st.metric("Avg Area (sq km)", f"{avg_area:.1f}")
        with metric_col4:
            st.metric("Inhabited Islands", inhabited_islands)

    with col2:
        st.subheader("🌡️ Climate Summary")
        if selected_group != 'All Groups':
            temp_range = filtered_df['Temperature (°C)'].iloc[0] if len(filtered_df) > 0 else "N/A"
            rainfall = filtered_df['Rainfall (mm/year)'].iloc[0] if len(filtered_df) > 0 else "N/A"
            humidity = filtered_df['Humidity (%)'].iloc[0] if len(filtered_df) > 0 else "N/A"
            st.write(f"**Temperature:** {temp_range}")
            st.write(f"**Rainfall:** {rainfall} mm/year")
            st.write(f"**Humidity:** {humidity}")

    # Charts section
    st.markdown("---")

    # Population Distribution
    if selected_group == 'All Groups':
        st.subheader("👥 Population Distribution")
    else:
        st.subheader(f"👥 {selected_group} Population Distribution")
    col1, col2 = st.columns(2)

    with col1:
        pop_by_group = filtered_df.groupby('Group/Region')['Population'].sum().reset_index()
        if len(pop_by_group) == 0 or pop_by_group['Population'].sum() == 0:
            st.info("📋 **Population Information**\n\nNo population data available for the selected region.")
        else:
            chart_title = "Population by Island Group" if selected_group == 'All Groups' else f"Population of {selected_group} Islands"
            fig_pop_group = px.bar(pop_by_group, x='Group/Region', y='Population', 
                                  title=chart_title,
                                  color='Population', color_continuous_scale='viridis')
            fig_pop_group.update_layout(xaxis_tickangle=-45)
            fig_pop_group.update_yaxes(tickformat=",d")
            st.plotly_chart(fig_pop_group, use_container_width=True)

    with col2:
        inhabited_islands = filtered_df[filtered_df['Population'] > 0]
        if len(inhabited_islands) == 0:
            st.info("📋 **Population Information**\n\nNo inhabited islands found in the selected region.")
        else:
            top_populated = inhabited_islands.nlargest(10, 'Population')[['Island Name', 'Population', 'Group/Region']]
            chart_title = "Top 10 Most Populated Islands" if selected_group == 'All Groups' else f"Most Populated Islands in {selected_group}"
            fig_top_pop = px.bar(top_populated, x='Population', y='Island Name', 
                                orientation='h', title=chart_title,
                                color='Group/Region')
            fig_top_pop.update_xaxes(tickformat=",d")
            st.plotly_chart(fig_top_pop, use_container_width=True)

    # Area and Tourism Analysis
    st.subheader("🗺️ Area & Tourism Analysis")
    col1, col2 = st.columns(2)

    with col1:
        if len(filtered_df) == 0:
            st.info("📋 **Area & Population Information**\n\nNo island data available for the selected region.")
        else:
            fig_area = px.scatter(filtered_df, x='Area (sq km)', y='Population', 
                                 size='Population', color='Group/Region',
                                 hover_data=['Island Name', 'Tourism'],
                                 title="Island Area vs Population")
            fig_area.update_yaxes(tickformat=",d")
            st.plotly_chart(fig_area, use_container_width=True)

    with col2:
        tourism_counts = filtered_df['Tourism'].value_counts()
        if len(tourism_counts) == 0:
            st.info("📋 **Tourism Information**\n\nNo tourism data available for the selected region.")
        else:
            fig_tourism = px.pie(values=tourism_counts.values, names=tourism_counts.index,
                                title="Distribution of Tourism Levels")
            st.plotly_chart(fig_tourism, use_container_width=True)

    # Climate Analysis
    st.subheader("🌦️ Climate Patterns")
    col1, col2 = st.columns(2)

    with col1:
        if len(filtered_df) == 0:
            st.info("📋 **Climate Information**\n\nNo climate data available for the selected region.")
        else:
            temp_avg = []
            for temp_range in filtered_df['Temperature (°C)']:
                if '–' in str(temp_range):
                    low, high = map(float, temp_range.split('–'))
                    temp_avg.append((low + high) / 2)
                else:
                    temp_avg.append(25)
            climate_df = filtered_df.copy()
            climate_df['Avg Temperature'] = temp_avg
            fig_climate = px.scatter(climate_df, x='Rainfall (mm/year)', y='Humidity (%)',
                                   size='Area (sq km)', color='Group/Region',
                                   hover_data=['Island Name', 'Avg Temperature'],
                                   title="Climate Patterns: Rainfall vs Humidity")
            st.plotly_chart(fig_climate, use_container_width=True)

    with col2:
        if len(filtered_df) == 0:
            st.info("📋 **Temperature Information**\n\nNo temperature data available for the selected region.")
        else:
            temp_avg = []
            for temp_range in filtered_df['Temperature (°C)']:
                if '–' in str(temp_range):
                    low, high = map(float, temp_range.split('–'))
                    temp_avg.append((low + high) / 2)
                else:
                    temp_avg.append(25)
            climate_df = filtered_df.copy()
            climate_df['Avg Temperature'] = temp_avg
            temp_by_group = climate_df.groupby('Group/Region')['Avg Temperature'].mean().reset_index()
            fig_temp = px.bar(temp_by_group, x='Group/Region', y='Avg Temperature',
                             title="Average Temperature by Island Group",
                             color='Avg Temperature', color_continuous_scale='Reds')
            fig_temp.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig_temp, use_container_width=True)

    # Protected Areas and Features
    st.subheader("🛡️ Protected Areas & Notable Features")
    col1, col2 = st.columns(2)

    with col1:
        protected_counts = filtered_df['Protected Status'].value_counts()
        if len(protected_counts) == 0 or (len(protected_counts) == 1 and protected_counts.index[0] == 'None'):
            st.info("📋 **Protected Status Information**\n\nNo protected areas found for the selected region. All islands in this area are currently not under any special protection status.")
        else:
            fig_protected = px.pie(values=protected_counts.values, names=protected_counts.index,
                                  title="Distribution of Protected Status")
            st.plotly_chart(fig_protected, use_container_width=True)

    with col2:
        features = []
        for feature_str in filtered_df['Notable Features'].dropna():
            features.extend([f.strip() for f in str(feature_str).split(',')])
        if len(features) == 0:
            st.info("📋 **Notable Features Information**\n\nNo notable features data available for the selected region.")
        else:
            feature_counts = pd.Series(features).value_counts().head(10)
            fig_features = px.bar(x=feature_counts.values, y=feature_counts.index,
                                 orientation='h', title="Most Common Notable Features")
            st.plotly_chart(fig_features, use_container_width=True)

    # Regional Analysis
    st.subheader("🗺️ Regional Distribution")
    col1, col2 = st.columns(2)

    with col1:
        region_counts = filtered_df['Group/Region'].value_counts()
        if len(region_counts) == 0:
            st.info("📋 **Regional Distribution Information**\n\nNo regional distribution data available for the selected region.")
        else:
            fig_regions = px.bar(x=region_counts.values, y=region_counts.index,
                            orientation='h', title="Number of Islands by Region",
                            color=region_counts.values, color_continuous_scale='Blues')
            st.plotly_chart(fig_regions, use_container_width=True)

    with col2:
        if len(filtered_df) == 0:
            st.info("📋 **Population Density Information**\n\nNo population density data available for the selected region.")
        else:
            region_stats = filtered_df.groupby('Group/Region').agg({
                'Population': 'sum',
                'Area (sq km)': 'sum'
            }).reset_index()
            region_stats['Population Density'] = region_stats['Population'] / region_stats['Area (sq km)']
            fig_density = px.bar(region_stats, x='Group/Region', y='Population Density',
                                title="Population Density by Region",
                                color='Population Density', color_continuous_scale='Greens')
            fig_density.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig_density, use_container_width=True)

    # State-wise Analysis
    st.subheader("🏛️ State-wise Island Distribution")
    col1, col2 = st.columns(2)

    with col1:
        if len(filtered_df) == 0:
            st.info("📋 **State Type Information**\n\nNo state type data available for the selected region.")
        else:
            coastal_states = ['Andaman', 'Nicobar', 'Lakshadweep', 'Kerala', 'Tamil Nadu', 'Karnataka', 
                             'Maharashtra', 'Mumbai', 'West Bengal', 'Odisha', 'Gujarat', 'Andhra Pradesh', 
                             'Goa', 'Diu']
            inland_states = ['Assam', 'Bihar', 'Arunachal Pradesh', 'Chhattisgarh', 'Haryana', 'Himachal Pradesh',
                            'Jharkhand', 'Madhya Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
                            'Punjab', 'Rajasthan', 'Sikkim', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand']
            state_type = []
            for region in filtered_df['Group/Region']:
                if region in coastal_states:
                    state_type.append('Coastal States')
                elif region in inland_states:
                    state_type.append('Inland States')
                else:
                    state_type.append('Other')
            filtered_df['State Type'] = state_type
            state_type_counts = filtered_df['State Type'].value_counts()
            fig_state_type = px.pie(values=state_type_counts.values, names=state_type_counts.index,
                                   title="Islands by State Type")
            st.plotly_chart(fig_state_type, use_container_width=True)

    with col2:
        if len(filtered_df) == 0:
            st.info("📋 **Unique Features Information**\n\nNo unique features data available for the selected region.")
        else:
            unique_features = filtered_df.groupby('Group/Region')['Notable Features'].apply(
                lambda x: len(set([item.strip() for sublist in x.dropna().str.split(',') for item in sublist]))
            ).reset_index(name='Unique Features')
            fig_unique = px.bar(unique_features, x='Group/Region', y='Unique Features',
                              title="Unique Features by Region",
                              color='Unique Features', color_continuous_scale='Purples')
            fig_unique.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig_unique, use_container_width=True) 
else:
    # show_riverine = st.sidebar.checkbox("Show only riverine islands", key="map_riverine") # This line is moved
    st.sidebar.download_button(
        "Download All Data (CSV)", data=islands_df.to_csv(index=False), file_name="all_islands_data.csv", key="map_all_data"
    )
    st.markdown("<h2 style='text-align:center;'>🗺️ Interactive Island Map</h2>", unsafe_allow_html=True)
    # Always show all islands (no filtering)
    map_df = islands_df.copy()
    map_df['Latitude'] = pd.to_numeric(map_df['Latitude'], errors='coerce')
    map_df['Longitude'] = pd.to_numeric(map_df['Longitude'], errors='coerce')
    map_df = map_df.dropna(subset=['Latitude', 'Longitude'])
    st.write(f"Number of islands on map: {len(map_df)}")
    # (Removed the st.write(map_df[['Island Name', 'Latitude', 'Longitude']].head()) line)
    # Force map to always open centered on India
    m = folium.Map(location=[20, 125], zoom_start=4, tiles='OpenStreetMap')
    # Add all island markers (no cluster labels)
    riverine_keywords = ['river', 'delta', 'inland', 'lake', 'backwater', 'riverine']
    for _, row in map_df.iterrows():
        features = str(row.get('Notable Features', '')).lower()
        feature_list = [f.strip() for f in str(row.get('Notable Features', '').replace(';', ',')).split(',') if f.strip()]
        features_display = ', '.join(feature_list)
        popup_html = f"""
        <div style='width:150px; font-size:15px;'>
          <b>{row['Island Name']}</b><br>
          <span style='font-weight:600;'>Group:</span> {row['Group/Region']}<br>
          <span style='font-weight:600;'>Known for:</span> {features_display}
        </div>
        """
        # Use a blue marker with water drop for riverine islands, palm tree icon for coastal islands
        if any(word in features for word in riverine_keywords):
            folium.Marker(
                location=[row['Latitude'], row['Longitude']],
                popup=folium.Popup(popup_html, max_width=250),
                tooltip=row['Island Name'],
                icon=folium.Icon(color='blue', icon='tint', prefix='fa')
            ).add_to(m)
        else:
            folium.Marker(
                location=[row['Latitude'], row['Longitude']],
                popup=folium.Popup(popup_html, max_width=250),
                tooltip=row['Island Name'],
                icon=folium.CustomIcon("https://img.icons8.com/emoji/48/palm-tree-emoji.png", icon_size=(32, 32))
            ).add_to(m)
    left, center, right = st.columns([1, 2, 1])
    with center:
        st_folium(m, width=1400, height=500, key=f"map_{len(map_df)}")
    # Show a table of islands missing coordinates
    missing_coords = islands_df[islands_df['Latitude'].isna() | islands_df['Longitude'].isna()]
    if not missing_coords.empty:
        st.markdown('---')
        st.write('The following islands could not be mapped due to missing coordinates:')
        st.dataframe(missing_coords[['Island Name', 'Group/Region', 'Notable Features']]) 
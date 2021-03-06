#version 150
#extension GL_ARB_shading_language_420pack : require
#extension GL_ARB_explicit_attrib_location : require

in vec3 ray_entry_position;
layout(location = 0) out vec4 FragColor;

uniform mat4 Modelview;

uniform sampler3D volume_texture;
uniform sampler2D transfer_texture;

uniform vec3    camera_location;
uniform float   sampling_distance;
uniform float	first_hit_threshold; // edited
uniform float   iso_value;
uniform vec3    max_bounds;
uniform ivec3   volume_dimensions;

uniform vec3    light_position;
uniform vec3    light_color;

bool
inside_volume_bounds(const in vec3 sampling_position)
{
    return (   all(greaterThanEqual(sampling_position, vec3(0.0)))
            && all(lessThanEqual(sampling_position, max_bounds)));
}

float
get_nearest_neighbour_sample(vec3 in_sampling_pos){
    
    vec3 obj_to_tex                 = vec3(1.0) / max_bounds;
    
    /// transform from texture space to array space
    /// ie: (0.3, 0.5, 1.0) -> (76.5 127.5 255.0)
    vec3 sampling_pos_array_space_f = in_sampling_pos * vec3(volume_dimensions);


    // this time we just round the transformed coordinates to their next integer neighbors
    // i.e. nearest neighbor filtering
    vec3 interpol_sampling_pos_f;
    interpol_sampling_pos_f.x = round(sampling_pos_array_space_f.x);
    interpol_sampling_pos_f.y = round(sampling_pos_array_space_f.y);
    interpol_sampling_pos_f.z = round(sampling_pos_array_space_f.z);	

    /// transform from array space to texture space
    vec3 sampling_pos_texture_space_f = interpol_sampling_pos_f/vec3(volume_dimensions);

    // access the volume data
    return texture(volume_texture, sampling_pos_texture_space_f * obj_to_tex).r;
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

// Aufgabe 1
float distance(vec3 pos1, vec3 pos2) {
	return sqrt(pow(pos1.x - pos2.x, 2.0) + pow(pos1.y - pos2.y, 2.0) + pow(pos1.z - pos2.z, 2.0));
}
float length_sqr(vec3 whatuwant) {
	return pow(whatuwant.x, 2.0) + pow(whatuwant.y, 2.0) + pow(whatuwant.z, 2.0);
}
float get_liniear_interpolation(vec3 a, vec3 b, vec3 ab, float A, float B) {
	float x = distance(a, ab) / distance(a, b);
	if(A == -1.0f)
		A = texture(volume_texture, a/vec3(volume_dimensions) * (vec3(1.0) / max_bounds)).r;
	if(B == -1.0f)
		B = texture(volume_texture, b/vec3(volume_dimensions) * (vec3(1.0) / max_bounds)).r;
	return (1 - x) * A + x * B;
}
float get_triliniear_sample(vec3 in_sampling_pos) {

	//if (inside_volume_bounds(in_sampling_pos)) {

		vec3 sampling_pos_array_space_f = in_sampling_pos * vec3(volume_dimensions);

		// POINTS
		float orig_x = sampling_pos_array_space_f.x;
		float orig_y = sampling_pos_array_space_f.y;
		float orig_z = sampling_pos_array_space_f.z;

		vec3 ab = vec3(orig_x, ceil(orig_y), floor(orig_z));
		vec3 cd = vec3(orig_x, ceil(orig_y), ceil(orig_z));
		vec3 ef = vec3(orig_x, floor(orig_y), floor(orig_z));
		vec3 gh = vec3(orig_x, floor(orig_y), ceil(orig_z));

		vec3 efgh = vec3(orig_x, floor(orig_y), orig_z);
		vec3 abcd = vec3(orig_x, ceil(orig_y), orig_z);

		// INTERPOLATE POINTS
		float ab_opa = get_liniear_interpolation(vec3(floor(orig_x), ceil(orig_y), floor(orig_z)), vec3(ceil(orig_x), ceil(orig_y), floor(orig_z)), ab, -1.0f, -1.0f);
		float cd_opa = get_liniear_interpolation(vec3(floor(orig_x), ceil(orig_y), ceil(orig_z)), vec3(ceil(orig_x), ceil(orig_y), ceil(orig_z)), cd, -1.0f, -1.0f);
		float ef_opa = get_liniear_interpolation(vec3(floor(orig_x), floor(orig_y), floor(orig_z)), vec3(ceil(orig_x), floor(orig_y), floor(orig_z)), ef, -1.0f, -1.0f);
		float gh_opa = get_liniear_interpolation(vec3(floor(orig_x), floor(orig_y), ceil(orig_z)), vec3(ceil(orig_x), floor(orig_y), ceil(orig_z)), gh, -1.0f, -1.0f);

		float x1 = distance(ab, abcd) / distance(ab, cd);
		float abcd_opa = (1 - x1) * ab_opa + x1 * cd_opa;
		float x2 = distance(ef, efgh) / distance(ef, gh);
		float efgh_opa = (1 - x2) * ef_opa + x2 * gh_opa;

		float x3 = distance(abcd, sampling_pos_array_space_f) / distance(abcd, efgh);
		float final_sample = (1 - x3) * abcd_opa + x3 * efgh_opa;

		return final_sample;
	/*} else {
		return -1.0;
	}*/
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

// Aufgabe 2
vec4 transfer(float sample) {
	return texture(transfer_texture, vec2(sample, sample));
}


// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

// Aufgabe 4
vec3 get_gradient(vec3 sample) {
	return vec3(
		(get_triliniear_sample(vec3(sample.x + sampling_distance, sample.y, sample.z)) - get_triliniear_sample(vec3(sample.x - sampling_distance, sample.y, sample.z))),
		(get_triliniear_sample(vec3(sample.x, sample.y + sampling_distance, sample.z)) - get_triliniear_sample(vec3(sample.x, sample.y - sampling_distance, sample.z))),
		(get_triliniear_sample(vec3(sample.x, sample.y, sample.z + sampling_distance)) - get_triliniear_sample(vec3(sample.x, sample.y, sample.z - sampling_distance)))
		);
	/*vec3 d;

	d.x = (float(get_triliniear_sample(sample_position + vec3(0.1, 0.0, 0.0)))
		- float(get_triliniear_sample(sample_position - vec3(0.1, 0.0, 0.0))));
	d.y = (float(get_triliniear_sample(sample_position + vec3(0.0, 0.1, 0.0)))
		- float(get_triliniear_sample(sample_position - vec3(0.0, 0.1, 0.0))));
	d.z = (float(get_triliniear_sample(sample_position + vec3(0.0, 0.0, 0.1)))
		- float(get_triliniear_sample(sample_position - vec3(0.0, 0.0, 0.1))));

	return d;*/
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

#define AUFGABE 5  // 31 32 331 332 4 5
void main() {

    /// One step trough the volume
    vec3 ray_increment      = normalize(ray_entry_position - camera_location) * sampling_distance;
    /// Position in Volume
    vec3 sampling_pos       = ray_entry_position + ray_increment; // test, increment just to be sure we are in the volume

    /// Init color of fragment
    vec4 dst = vec4(0.0, 0.0, 0.0, 0.0);

    /// check if we are inside volume
    bool inside_volume = inside_volume_bounds(sampling_pos);

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

#if AUFGABE == 31	

	// MAX INTENSITY
	float max_val = 0.0;
	while (inside_volume_bounds(sampling_pos)) {
		max_val = max(get_triliniear_sample(sampling_pos), max_val);
        sampling_pos  += ray_increment;
    }
	dst = transfer(max_val);
#endif 

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 
    
#if AUFGABE == 32	

	// AVERAGE
	int count = 0;
	while(inside_volume_bounds(sampling_pos)) {
		float s = get_triliniear_sample(sampling_pos);
		if (s > 0.1) {
			dst += transfer(s);
			count++;
		}
        sampling_pos += ray_increment;
    }
	dst /= count;
#endif

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 
    
#if AUFGABE == 331
	
	// COMPOSITING | FRONT - TO - BACK
	float trans = 1.0;
	while (inside_volume_bounds(sampling_pos) && trans > 0.0) {
		float s = get_triliniear_sample(sampling_pos);
		if (s > 0.1) {
			vec4 tmp_col = transfer(s);			
			dst += tmp_col * tmp_col.a * trans;
			trans = trans * (1 - tmp_col.a);
		}
		sampling_pos += ray_increment;
	}
	dst.a = 1.0;
#endif 

#if AUFGABE == 332

	// COMPOSITING | BACK - TO - FRONT
	while (inside_volume_bounds(sampling_pos)) {
		sampling_pos += ray_increment;
	}
	//sampling_pos = max_bounds;

	while (inside_volume) {
		float s = get_triliniear_sample(sampling_pos);
		if (s > 0.1) {
			vec4 src = transfer(s);
			float a = src.a;
			dst.r = src.r * a + dst.r * (1 - a);
			dst.g = src.g * a + dst.g * (1 - a);
			dst.b = src.b * a + dst.b * (1 - a);
		}

		sampling_pos -= ray_increment;
		inside_volume = inside_volume_bounds(sampling_pos);
	}
	dst.a = 1.0;

#endif 

	// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

#if AUFGABE == 4
    
	// GRADIENT + LIGHT PHONG
	// COMPOSITING | FRONT - TO - BACK
	float trans = 1.0;

	while (inside_volume_bounds(sampling_pos) && trans > 0.0) {
		float s = get_triliniear_sample(sampling_pos);
		if (s > 0.1) {

			// light calculation
			vec3 gradient = normalize(get_gradient(sampling_pos));
			float cos_of_vec = 0.0;			
			float cos_pow = 0.0;


			if (length_sqr(gradient) > 0.1) {
				vec3 l = normalize(sampling_pos - light_position);			
				cos_of_vec = max(0.0, dot(l, gradient));

				vec3 reflection = normalize(2 * dot(-l, gradient) * gradient + l);
				float tmp_dot = dot(reflection, normalize(-ray_increment));
				cos_pow = pow(tmp_dot, 100);
			}

			vec4 tmp_col = transfer(s);

			// vec3 to vec4 for calculation
			vec4 light_col = vec4(light_color.r, light_color.g, light_color.b, 1.0);	

			// AMBIENT
			dst += tmp_col * tmp_col.a * trans;

			// DIFFUSE						
			dst += tmp_col * tmp_col.a * trans * (cos_of_vec * light_col) * 2;

			// SPECLUAR
			if (cos_pow > 0.0)
				dst += tmp_col * (cos_pow * light_col) * 0.1;

			trans = trans * (1 - tmp_col.a);

		}
		sampling_pos += ray_increment;
	}
	dst.a = 1.0;
#endif 

	// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

#if AUFGABE == 5 // & Aufgabe 6 & Aufgabe 7

    // FIRST HIT ISO SURFACE
	bool hit = false;
	while (inside_volume_bounds(sampling_pos) && !hit) {
		float s = get_triliniear_sample(sampling_pos);

		if (s > first_hit_threshold) {				
			vec3 minor_step = sampling_pos - ray_increment;

			//Binary Search Method
			while (length_sqr(sampling_pos - minor_step) > length_sqr(ray_increment) * 0.00001) {
				vec3 test_sample = vec3(0.0, 0.0, 0.0);
				test_sample.x = minor_step.x + (sampling_pos.x - minor_step.x) / 2;
				test_sample.y = minor_step.y + (sampling_pos.y - minor_step.y) / 2;
				test_sample.z = minor_step.z + (sampling_pos.z - minor_step.z) / 2;
				if (get_triliniear_sample(test_sample) > first_hit_threshold){
					sampling_pos = test_sample;
				} else {
					minor_step = test_sample;
				}
			}
			//vec3 src = vec3f(0.0f, 0.0f, 0.0f);

			// light calculation
			vec3 gradient = normalize(get_gradient(sampling_pos));
			float cos_of_vec = 0.0;
			float cos_pow = 0.0;


			if (length_sqr(gradient) > 0.1) {
				vec3 l = normalize(sampling_pos - light_position);
				cos_of_vec = max(0.0, dot(l, gradient));

				vec3 reflection = normalize(2 * dot(-l, gradient) * gradient + l);
				float tmp_dot = dot(reflection, normalize(ray_increment * (-1)));
				cos_pow = pow(tmp_dot, 100);
			}

			vec4 col = transfer(s);
			col += (0.4 * cos_of_vec);
			if (cos_pow > 0.0)
				col += (1.4 * cos_pow);
			dst = col;
			hit = true;
		}
			

        sampling_pos += ray_increment;
    }
    
#endif 

    // return the calculated color value
    FragColor = dst;
}
